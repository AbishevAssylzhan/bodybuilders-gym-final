# Bodybuilders Gym

Final project for Web Technologies  
Astana IT University — Group SE-2512
### Team: Assylzhan Abishev, Bek Urazbek, Darkhan Daurambekov

A responsive fitness website for exploring training programs, membership plans, schedules and exercises.

## Links

- Live website: https://abishevassylzhan.github.io/bodybuilders-gym-final/
- Repository: https://github.com/AbishevAssylzhan/bodybuilders-gym-final

## Team

| Member | Responsibilities |
|---|---|
| Urazbek Bek | Home, About, Gallery, Pricing and Schedule pages; shared styles, responsive layouts and images |
| Abishev Assylzhan | Sign Up, Log In, Profile, Contact and FAQ; authentication simulation and JavaScript form validation |
| Daurambekov Darkhan | Exercise API integration, search and filters, Programs, Dashboard, jQuery effects and theme initialization |

Each team member contributed four initial commits. Further commits document project updates and fixes.

## Technologies

- HTML5
- CSS3, Flexbox, Grid and media queries
- Bootstrap 5
- JavaScript
- jQuery
- Fetch API
- localStorage
- GitHub Pages

## Pages

The website contains 13 connected pages:

1. Home — introduction and gym highlights.
2. About — club information and team members.
3. Programs — training programs with search and filtering.
4. Exercises — exercise library with API data and saved exercises.
5. Schedule — training timetable.
6. Pricing — membership plans.
7. Gallery — gym photo gallery.
8. FAQ — expandable questions and answers.
9. Contact — locally saved demo requests.
10. Sign Up — account registration.
11. Log In — credential checking.
12. Profile — member details and saved exercises.
13. Dashboard — interactive features.

## Main Features

### Responsive Design

Layouts adapt to desktop, tablet and mobile screens. Navigation collapses into a mobile menu.

### Light and Dark Modes

Users can switch between light and dark themes. The selected theme is stored in localStorage and applied across pages.

### Authentication Simulation

Registration saves account data in the browser. Login checks locally stored credentials and opens the profile page.

The profile displays member information and saved exercises. Users can log out and log in again.

This is an educational simulation, not production authentication. Account data, including passwords, is stored locally. Use test credentials only.

### JavaScript Form Validation

Forms use `novalidate` and JavaScript validation with inline feedback.

Validation covers the relevant fields in each form:

- Required values
- Email format
- Kazakhstan phone number format
- Password length and complexity
- Password confirmation
- Agreement checkbox

The registration form also supports the `BODY2026` promo code for a simulated 10% first-month discount.

### Search and Filtering

Users can search exercises by name or muscle and filter them by category and equipment.

Exercises can be saved, viewed in the profile and removed. Recent exercise searches are stored locally.

Training programs also support search and category filtering.

### External API

The exercise library retrieves data using `fetch()` and `async/await`.

- Primary source: [wger API](https://wger.de/en/software/api)
- Backup source: [free-exercise-db](https://github.com/yuhonas/free-exercise-db)

The implementation includes a loading state, request timeout, error handling and fallback data handling.

Some exercises use generic gym images when a specific illustration is unavailable.

### Interactive Effects

The website includes hover transitions, an image carousel, FAQ accordions, a subscription popup, toast notifications, loading indicators and optional sound effects.

### Local Demo Forms

Contact requests and newsletter subscriptions are saved in the current browser. No message or email is sent to a real gym.

## Project Structure

```text
bodybuilders-gym-final/
├── index.html
├── about.html
├── programs.html
├── exercises.html
├── schedule.html
├── pricing.html
├── gallery.html
├── faq.html
├── contact.html
├── signup.html
├── login.html
├── profile.html
├── dashboard.html
├── css/
│   └── style.css
├── js/
│   ├── advanced.js
│   ├── auth.js
│   ├── exercises.js
│   ├── jquery-features.js
│   ├── script.js
│   ├── theme-init.js
│   └── validation.js
├── data/
│   └── more-programs.json
├── images/
├── sounds/
└── README.md
```

## Running Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/AbishevAssylzhan/bodybuilders-gym-final.git
   ```

2. Open the project in your editor.
3. Start a local HTTP server, such as VS Code Live Server.
4. Open `index.html` through the server.

Use an HTTP server instead of opening HTML directly with `file://`, so local JSON requests work correctly.

Internet access is needed for external APIs and CDN resources.

## Testing

The team checked the published website for:

- Navigation and image loading
- Mobile, tablet and desktop layouts
- Theme persistence
- Registration, login, logout and profile display
- Inline validation errors
- Exercise search, filtering, saving and removal
- Contact request confirmation
- Successful API requests in the browser Network panel

## Limitations

- There is no backend or database.
- Browser data is not synchronized between devices.
- Clearing browser storage removes locally saved data.
- Membership prices and promo codes are demonstrations; no payments are processed.
- External data availability depends on third-party services.
