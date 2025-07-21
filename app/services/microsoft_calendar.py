# app/services/microsoft_calendar.py

import os
import msal
import requests
from flask import current_app, session, url_for

# This scope is for the app-only authentication
APP_ONLY_SCOPE = ["https://graph.microsoft.com/.default"]

# This scope is for the user-delegated authentication (for later)
USER_SCOPES = ["Calendars.ReadWrite"]

# A simple in-memory cache for the app-only token
app_cache = {"access_token": None}

def _build_msal_app(for_user=False):
    """
    Builds the MSAL client application.
    - If for_user is True, it builds an app for the user-delegated flow.
    - Otherwise, it builds an app for the app-only (client credentials) flow.
    """
    if for_user:
        # This is the flow we had before, for user login
        return msal.ConfidentialClientApplication(
            client_id=current_app.config['MICROSOFT_CLIENT_ID'],
            authority=f"https://login.microsoftonline.com/{current_app.config['MICROSOFT_TENANT_ID']}",
            client_credential=current_app.config['MICROSOFT_CLIENT_SECRET'],
        )
    else:
        # This is the app-only flow
        return msal.ConfidentialClientApplication(
            client_id=current_app.config['MICROSOFT_CLIENT_ID'],
            authority=f"https://login.microsoftonline.com/{current_app.config['MICROSOFT_TENANT_ID']}",
            client_credential=current_app.config['MICROSOFT_CLIENT_SECRET'],
        )

def _get_app_only_token():
    """
    Acquires an access token for the application itself.
    It caches the token in memory to avoid unnecessary requests.
    """
    # If we have a valid token in our simple cache, return it
    if app_cache.get("access_token"):
        return app_cache["access_token"]

    # Otherwise, acquire a new one
    app = _build_msal_app()
    result = app.acquire_token_silent(scopes=APP_ONLY_SCOPE, account=None)

    if not result:
        # No token in cache, acquire a new one from AAD
        result = app.acquire_token_for_client(scopes=APP_ONLY_SCOPE)

    if "access_token" in result:
        # Cache the new token and return it
        app_cache["access_token"] = result["access_token"]
        return result["access_token"]
    else:
        # Throw an error if we can't get a token
        raise Exception("Could not acquire app-only token: " + result.get("error_description"))

def get_calendar_events():
    """
    Fetches events from the central boardroom calendar using an app-only token.
    """
    access_token = _get_app_only_token()
    boardroom_email = current_app.config.get("MICROSOFT_BOARDROOM_EMAIL")
    calendar_id = current_app.config.get("MICROSOFT_CALENDAR_ID")

    if not all([access_token, boardroom_email, calendar_id]):
        print("Error: Missing Microsoft config in .env file (email, calendar id)")
        return []

    # The Graph API endpoint now uses the boardroom's email (User Principal Name)
    graph_endpoint = f"https://graph.microsoft.com/v1.0/users/{boardroom_email}/calendars/{calendar_id}/events"
    
    headers = {'Authorization': f'Bearer {access_token}'}
    try:
        response = requests.get(graph_endpoint, headers=headers)
        response.raise_for_status()
        ms_events = response.json().get('value', [])
        
        formatted_events = []
        for event in ms_events:
            formatted_events.append({
                'title': event.get('subject'),
                'start': event.get('start', {}).get('dateTime'),
                'end': event.get('end', {}).get('dateTime'),
                'color': '#0F7B6C', # A nice Microsoft Teal color
                'borderColor': '#0F7B6C'
            })
        return formatted_events
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Microsoft Calendar events: {e}")
        return []


# --- User Login Functions (we will use these later) ---

def get_user_auth_url():
    """Generates the unique sign-in URL for the user."""
    session["state"] = os.urandom(16).hex()
    auth_url = _build_msal_app(for_user=True).get_authorization_request_url(
        USER_SCOPES,
        state=session["state"],
        redirect_uri=url_for("main.microsoft_callback", _external=True)
    )
    return auth_url

def get_token_from_code_for_user(authorization_code):
    """Exchanges the authorization code for a user-delegated access token."""
    app = _build_msal_app(for_user=True)
    result = app.acquire_token_by_authorization_code(
        authorization_code,
        scopes=USER_SCOPES,
        redirect_uri=url_for("main.microsoft_callback", _external=True)
    )
    if "access_token" in result:
        session["microsoft_user_token"] = result
    return result