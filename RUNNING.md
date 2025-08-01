# Running BoardRoom-Booker

This application supports two different running modes for development and production use, with an interactive terminal menu for easy mode selection.

## 🚀 Quick Start

### Interactive Mode (Recommended)
Simply run the application without arguments to get an interactive menu:

```bash
.venv\Scripts\activate
python run.py
```

You'll see a menu like this:
```
==================================================
🚀 BoardRoom-Booker - Choose Run Mode
==================================================
1. Development Mode (Auto-login)
   - Auto-login as dev@test.com / dev123
   - Create development user if needed
   - Debug mode enabled

2. User Mode (Normal Authentication)
   - Requires manual login/registration
   - Production-like settings
   - Debug mode enabled

3. Custom Mode (Command line options)
   - Use command line arguments

0. Exit
==================================================

Enter your choice (0-3):
```

### Command Line Mode
For automation or custom configuration, use command line arguments:

```bash
# Development mode
python run.py --mode dev

# User mode
python run.py --mode user

# Custom host and port
python run.py --mode dev --host 0.0.0.0 --port 8080

# Show help
python run.py --help
```

## 🔧 Command Line Options

The `run.py` script supports several command-line arguments:

```bash
python run.py [OPTIONS]

Options:
  --mode {user,dev}     Run mode: user (normal) or dev (auto-login) [default: user]
  --host HOST           Host to run the server on [default: 127.0.0.1]
  --port PORT           Port to run the server on [default: 5000]
  --debug               Run in debug mode [default: True]
  --help                Show this help message
```

## 📋 Mode Differences

### Development Mode (`--mode dev` or choice `1`)
- ✅ **Auto-login**: Automatically logs in as `dev@test.com / dev123`
- ✅ **Dev User Creation**: Creates development user if it doesn't exist
- ✅ **Debug Mode**: Full debug information and auto-reload
- ✅ **Development Environment**: Sets `FLASK_ENV=development`
- 🔧 **Use Case**: Development, testing, quick prototyping

### User Mode (`--mode user` or choice `2`)
- 🔐 **Normal Authentication**: Requires manual login/registration
- 🛡️ **Production-like**: Sets `FLASK_ENV=production`
- 🔧 **Use Case**: Testing user flows, production simulation

## 👤 Development User

When running in development mode, a special development user is created:

- **Email**: `dev@test.com`
- **Password**: `dev123`
- **Role**: Admin
- **Company**: Test Company (test.com)

This user has full admin privileges and can:
- Manage rooms
- Create/edit/delete bookings
- Access all company features

## 🌐 Access URLs

Once the server is running, access the application at:

- **Main Application**: http://127.0.0.1:5000
- **Login Page**: http://127.0.0.1:5000/auth/login
- **Registration Page**: http://127.0.0.1:5000/auth/register

## 🔄 Switching Modes

You can switch between modes by:

1. **Stop the current server** (Ctrl+C)
2. **Run the application again** (`python run.py`)
3. **Choose the desired mode** from the interactive menu
4. **Access the application** at http://127.0.0.1:5000

## 🛠️ Custom Configuration

You can customize the server settings using command line arguments:

```bash
# Run on different host/port
python run.py --mode dev --host 0.0.0.0 --port 8080

# Run in user mode on specific port
python run.py --mode user --port 3000

# Run with custom settings
python run.py --mode dev --host 0.0.0.0 --port 8080 --debug
```

## 📝 Notes

- The development user is only created in dev mode
- Auto-login only works in dev mode
- Both modes use debug=True by default for development convenience
- The virtual environment (`.venv`) must be activated before running
- Use Ctrl+C to stop the server and return to the menu
- The interactive menu is the easiest way to get started 