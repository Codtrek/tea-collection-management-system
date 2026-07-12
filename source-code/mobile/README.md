# Harboost Mobile Application

## About the Project

Harboost Mobile is the mobile application for the **Harboost Tea Collection Management System**. It is built using:

- Expo
- React Native
- TypeScript
- Expo Router
- pnpm

This project uses **Expo Development Build** instead of **Expo Go**.

A Development Build includes the native Android/iOS code required by the project, allowing us to use native libraries that are not supported by Expo Go.

---

# Prerequisites

Before working on this project, make sure you have:

## 1. Access to the project

- GitHub repository access
- Expo Organization access

Ask the project administrator if you don't have access.

---

## 2. Install required software

- Node.js (LTS)
- pnpm
- Git
- Android Studio
- Android SDK
- Java JDK
- EAS CLI

Install pnpm

```bash
npm install -g pnpm
```

Install EAS CLI

```bash
pnpm add -g eas-cli
```

---

## 3. Clone the project

```bash
git clone <repository-url>
```

Move into the project.

```bash
cd mobile
```

---

## 4. Install dependencies

```bash
pnpm install
```

---

## 5. Login to Expo

```bash
eas login
```

Verify your account.

```bash
eas whoami
```

---

## 6. Install the Development Build

Install the latest **Harboost Development Build** on your Android device.

> Do **not** use Expo Go to run this project.

---

# Working on the Project

## 1. Get the latest code

```bash
git switch develop
git pull origin develop
```

---

## 2. Create your feature branch

```bash
git switch -c feature/<feature-name>
```

Example

```bash
git switch -c feature/login-screen
```

Never develop directly on the `develop` branch.

---

## 3. Start the development server

```bash
pnpm expo start
```

Open the project using the **Harboost Development Build** installed on your device.

---

## 4. Develop your feature

Make your changes and test them.

Fast Refresh will automatically reload the app when you save changes.

---

## 5. Commit your work

```bash
git add .
git commit -m "feat: add login screen"
```

---

## 6. Push your branch

```bash
git push origin feature/<feature-name>
```

---

## 7. Create a Pull Request

Create a Pull Request from your feature branch into the `develop` branch.

After review, your changes will be merged.

---

# Working with a Development Build

A Development Build works almost the same as Expo Go.

For normal development (UI, business logic, API integration, styling):

```bash
pnpm expo start
```

No rebuild is required.

### When is a rebuild required?

If someone adds or updates a **native dependency** (for example `react-native-maps` or `react-native-vision-camera`), everyone must install the updated Development Build or rebuild the app locally.

For normal React Native development, simply pull the latest code and continue working.

---

# Team Rules

- Always pull the latest changes before starting work.
- Always create a feature branch.
- Never push directly to `main` or `develop`.
- Use **pnpm** for package management.
- Test your feature before creating a Pull Request.
- Discuss with the team before adding new native dependencies.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)


You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).



## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.