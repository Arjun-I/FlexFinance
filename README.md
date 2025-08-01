# FlexFinance - Personal Finance App

A modern React Native finance app with Firebase authentication, risk assessment, and beautiful UI.

## Features

- 🔐 **Firebase Authentication** - Secure login/signup with email and password
- 📊 **Risk Assessment Quiz** - Interactive quiz to determine investment risk tolerance
- 💰 **Financial Dashboard** - Overview of balance, income, expenses, and investments
- 🎨 **Modern UI** - Beautiful gradient backgrounds and smooth animations
- 📱 **Responsive Design** - Works on iOS and Android

## Screenshots

### Login Screen
- Modern gradient background
- Email and password authentication
- Toggle between login and signup
- Password visibility toggle

### Risk Assessment Quiz
- 5 comprehensive questions
- Progress tracking
- Risk profile calculation
- Beautiful results display

### Dashboard
- Financial overview with balance and stats
- Recent transactions
- Tab navigation (Overview, Budget, Investments, Profile)
- Sign out functionality

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   - Your Firebase config is already set up in `firebase.js`
   - Make sure your Firebase project has Authentication enabled

3. **Run the App**
   ```bash
   npm start
   ```

4. **Test on Device/Simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## App Flow

1. **Login/Signup** - Users authenticate with Firebase
2. **Risk Assessment** - New users complete a 5-question risk quiz
3. **Dashboard** - Main app with financial overview and navigation

## Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **Firebase** - Authentication and backend services
- **React Navigation** - Screen navigation
- **Expo Linear Gradient** - Beautiful gradient backgrounds
- **Expo Vector Icons** - Icon library

## File Structure

```
FlexFinance-1/
├── App.js              # Main app component with navigation
├── firebase.js         # Firebase configuration
├── LoginScreen.js      # Authentication screen
├── RiskQuiz.js         # Risk assessment quiz
├── Dashboard.js        # Main dashboard with tabs
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Customization

### Colors
The app uses a modern dark theme with:
- Primary: `#6366f1` (Indigo)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Background: `#0f172a` (Dark slate)

### Adding Features
- **Budget Tracking** - Implement in the Budget tab
- **Investment Portfolio** - Add to the Investments tab
- **Data Persistence** - Use Firebase Firestore for user data
- **Push Notifications** - Add with Expo notifications

## Development

### Adding New Screens
1. Create a new component file
2. Add it to the navigation stack in `App.js`
3. Update the navigation logic as needed

### Styling
The app uses a consistent design system with:
- Rounded corners (12px radius)
- Subtle borders and shadows
- Gradient backgrounds
- Consistent spacing (24px, 16px, 12px)

## Troubleshooting

### Common Issues
1. **Firebase Auth Errors** - Check your Firebase configuration
2. **Navigation Issues** - Ensure all dependencies are installed
3. **Gradient Not Working** - Make sure `expo-linear-gradient` is installed

### Getting Help
- Check the Expo documentation
- Review Firebase setup guides
- Test on different devices/simulators

## License

This project is for educational purposes. Feel free to modify and extend it for your own projects.