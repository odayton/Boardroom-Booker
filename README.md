# BoardRoom Booker

A modern boardroom booking application built with Flask and custom CSS.

## Features

- Interactive calendar interface for booking boardrooms
- Google and Microsoft calendar integration
- Create, edit, and delete bookings
- Responsive design with custom CSS
- Real-time calendar updates

## Project Structure

```
BoardRoom-Booker/
├── app/
│   ├── static/
│   │   ├── css/
│   │   │   ├── base.css          # Base styles and CSS reset
│   │   │   ├── layout.css        # Layout utilities and grid system
│   │   │   ├── components.css    # Component-specific styles
│   │   │   └── main.css          # Main CSS file (imports all others)
│   │   └── js/
│   │       └── calendar.js       # Calendar functionality
│   ├── templates/
│   │   ├── base.html             # Base template
│   │   ├── index.html            # Main page
│   │   └── partials/             # Modal templates
│   ├── services/                 # Calendar service integrations
│   └── routes.py                 # Flask routes
├── config.py                     # Configuration
├── requirements.txt              # Python dependencies
└── run.py                       # Application entry point
```

## CSS Architecture

The application uses a modular CSS architecture with the following structure:

### Base CSS (`base.css`)
- CSS reset and base styles
- Typography settings
- Basic element styling
- Focus states

### Layout CSS (`layout.css`)
- Utility classes for layout
- Flexbox and grid utilities
- Spacing utilities
- Responsive breakpoints

### Components CSS (`components.css`)
- Navigation styles
- Button components
- Form elements
- Modal components
- Calendar styling
- Color utilities

### Main CSS (`main.css`)
- Imports all other CSS files in the correct order

## Getting Started

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Node.js dependencies (for FullCalendar):
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   python run.py
   ```

4. Open your browser and navigate to `http://localhost:5000`

## Customization

The CSS is organized in a modular way, making it easy to customize:

- **Colors**: Modify color variables in `components.css`
- **Typography**: Update font settings in `base.css`
- **Layout**: Adjust spacing and grid in `layout.css`
- **Components**: Customize specific components in `components.css`

## Browser Support

The application supports modern browsers with CSS Grid and Flexbox support:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
