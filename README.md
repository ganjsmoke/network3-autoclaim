
# Network3 Auto Claim

This project is a Node.js script designed to interact with the Network3 API for managing accounts, retrieving card information, and activating specific cards. The script handles multiple accounts and includes features like token management, retry mechanisms, and automation of card activation.

## Features

- **Token Management**: Automatically fetches and updates tokens when they are missing or expired.
- **Retry Mechanism**: Retries failed API requests with configurable delays.
- **Card Activation**: Activates eligible cards based on specific criteria 
- **Automation**: Continuously processes accounts and cards with a delay between cycles (default: 4 hours and 10 minutes).

## Prerequisites

- **Node.js**: Ensure you have Node.js installed.
- **NPM**: Node.js package manager to install dependencies.
- **Accounts File**: An `accounts.txt` file containing account details.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/ganjsmoke/network3-autoclaim.git
   cd network3-autoclaim
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create an `accounts.txt` file in the root directory with the following format:
   ```
   email1,password1,token1
   email2,password2,token2
   email3,password3,token3
   ```
   - If a token is missing, leave it empty (e.g., `email,password,`).
   - Separate multiple accounts with a new line.

## Usage

Run the script using Node.js:
```bash
node index.js
```

### What the Script Does
- Reads account details from `accounts.txt`.
- Fetches new tokens if missing or expired.
- Retrieves the list of cards for each account.
- Activates cards with `user_status` = 3 and non-empty `open_time`.
- Skips already activated cards (`user_status` = 2).
- Updates `accounts.txt` with new tokens.
- Repeats the process after a delay (default: 4 hours and 10 minutes).

## Configuration

- **Retry Delay**: Modify the retry delay (default: 2000ms) in the `withRetries` function.
- **Cycle Delay**: Adjust the delay between processing cycles in the `activateAllOpenCards` function:
  ```javascript
  await new Promise(resolve => setTimeout(resolve, (4 * 60 * 60 + 10 * 60) * 1000));
  ```

## Dependencies

- [Axios](https://www.npmjs.com/package/axios): For making HTTP requests.
- [Chalk](https://www.npmjs.com/package/chalk): For colorized console output.

## Example Output

```bash
🔑 No token found for email@example.com. Fetching a new one...
✅ Token retrieved successfully.
🔄 Processing cards for email@example.com...
🔄 Activating card with task_id 1 for email@example.com...
📄 Raw response for activating card with task_id 1: { code: 0, data: true }
✅ Card with task_id 1 activated successfully.
⏭️ Skipping card with task_id 2 (user_status = 2).
✅ Finished processing all accounts and cards.
⏳ Waiting for 4 hours 10 minutes before repeating the process...
```

## Notes

- Ensure `accounts.txt` is properly formatted to avoid errors.
- Tokens are trimmed before being used in requests to prevent issues with invalid characters.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
