import os
from flask import current_app, url_for, session, request
from google_auth_oauthlib.flow import Flow

# The permissions we request from the user for their calendar.
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

def get_google_auth_flow():
    """
    Initializes and returns the Google OAuth 2.0 Flow object.
    """
    client_secrets_info = {
        "web": {
            "client_id": current_app.config['GOOGLE_CLIENT_ID'],
            "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [url_for('main.google_callback', _external=True)]
        }
    }
    return Flow.from_client_config(
        client_config=client_secrets_info,
        scopes=SCOPES,
        redirect_uri=url_for('main.google_callback', _external=True)
    )

def get_google_auth_url():
    """
    Generates the unique sign-in URL for the user.
    """
    flow = get_google_auth_flow()
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )
    # Store the state so we can verify the callback
    session['google_auth_state'] = state
    return authorization_url

def get_token_from_code_for_google(authorization_response):
    """
    Exchanges the authorization code for a user access token.
    """
    flow = get_google_auth_flow()
    state = session.pop('google_auth_state', '')
    
    # Verify the state to prevent CSRF
    if state != request.args.get('state'):
        raise Exception("State does not match. Possible CSRF attack.")

    flow.fetch_token(authorization_response=authorization_response)
    
    # Store the credentials in the session.
    credentials = flow.credentials
    session['google_credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }