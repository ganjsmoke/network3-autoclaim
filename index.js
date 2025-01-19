const fs = require('fs');
const axios = require('axios');
const chalk = require('chalk');

// Utility function to handle retries for any request, specifically for 504 errors, with delay between retries
async function withRetries(fn, retries = 10, delay = 600000, ...args) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(...args);
    } catch (error) {
      if (error.response && error.response.status === 504) {
        console.log(chalk.yellow(`⚠️ 504 Gateway Time-out on attempt ${attempt}. Retrying after ${delay}ms...`));
      } else {
        console.error(chalk.red(`❌ Error on attempt ${attempt}:`), error.message);
        throw error; // Throw non-504 errors immediately
      }

      if (attempt >= retries) {
        console.error(chalk.red(`❌ Exhausted retries after ${retries} attempts for 504 Gateway Time-out.`));
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay)); // Delay before next retry
    }
  }
}

// Function to get the bearer token
async function getToken(email, password) {
  try {
    const response = await withRetries(() => axios.post('https://account.network3.ai/api/network3_login', {
      e: email,
      p: password
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      }
    }));

    if (response.data.succ === 0 && response.data.data) {
      console.log(chalk.green('✅ Token retrieved successfully.'));
      return response.data.data;
    } else {
      throw new Error('Failed to retrieve token: ' + response.data.msg);
    }
  } catch (error) {
    console.error(chalk.red('❌ Error getting token:'), error.message);
    throw error;
  }
}

// Function to update accounts.txt with a new token
function updateTokenInFile(email, newToken) {
  const filePath = 'accounts.txt';
  const accounts = fs.readFileSync(filePath, 'utf8').split('\n').filter(line => line.trim() !== '');

  const updatedAccounts = accounts.map(line => {
    const accountsInLine = line.split(';');
    const updatedLine = accountsInLine.map(account => {
      const [accEmail, password, token] = account.split(',');
      if (accEmail === email) {
        return `${accEmail},${password},${newToken}`;
      }
      return account;
    }).join(';');
    return updatedLine;
  });

  fs.writeFileSync(filePath, updatedAccounts.join('\n'));
  console.log(chalk.green(`✅ Updated token for ${email} in accounts.txt.`));
}

// Function to get the cards list
async function getCardsList(token) {
  try {
    const response = await withRetries(() => axios.get('https://account.network3.ai/v1/cards', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      }
    }));

    if (response.data.code === 0) {
      console.log(chalk.green('✅ Cards retrieved successfully.'));
      return response.data.data;
    } else {
      throw new Error('Failed to retrieve cards: ' + response.data.msg);
    }
  } catch (error) {
    console.error(chalk.red('❌ Error getting cards:'), error.message);
    throw error;
  }
}

// Function to activate a card
async function activateCard(token, taskId, retries = 3) {
  try {
    const response = await withRetries(() => axios.post('https://account.network3.ai/auth/card/activation', {
      task_id: taskId
    }, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      }
    }), retries);

    console.log(chalk.blue(`📄 Raw response for activating card with task_id ${taskId}:`), response.data);

    if (response.data.code === 0) {
      console.log(chalk.green(`✅ Card with task_id ${taskId} activated successfully.`));
      return response.data;
    } else {
      console.log(chalk.yellow(`⚠️ Failed to activate card with task_id ${taskId}: ${response.data.msg}`));
      return null;
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error activating card with task_id ${taskId}:`), error.message);
    return null;
  }
}

// Function to print header
function printHeader() {
    const line = "=".repeat(50);
    const title = "Auto Claim Card Network3";
    const createdBy = "Bot created by: https://t.me/airdropwithmeh";

    const totalWidth = 50;
    const titlePadding = Math.floor((totalWidth - title.length) / 2);
    const createdByPadding = Math.floor((totalWidth - createdBy.length) / 2);

    const centeredTitle = title.padStart(titlePadding + title.length).padEnd(totalWidth);
    const centeredCreatedBy = createdBy.padStart(createdByPadding + createdBy.length).padEnd(totalWidth);

    console.log(chalk.cyan.bold(line));
    console.log(chalk.cyan.bold(centeredTitle));
    console.log(chalk.green(centeredCreatedBy));
    console.log(chalk.cyan.bold(line));
}

// Main function to activate all cards with open_time
async function activateAllOpenCards() {
  while (true) {
    try {
      const lines = fs.readFileSync('accounts.txt', 'utf8').split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        const accounts = line.split(';');

        for (const account of accounts) {
          const [email, password, token] = account.split(',');

          let activeToken = token ? token.trim() : null;
          if (!activeToken) {
            console.log(chalk.yellow(`🔑 No token found for ${email}. Fetching a new one...`));
            activeToken = await getToken(email, password);
            updateTokenInFile(email, activeToken);
          }

          console.log(chalk.blue(`🔄 Processing cards for ${email}...`));
          const cards = await getCardsList(activeToken);

          for (const card of cards) {
            if (card.user_status === 3 && card.open_time) {
              console.log(chalk.blue(`🔄 Activating card with task_id ${card.task_id} for ${email}...`));
              await activateCard(activeToken, card.task_id);
            } else if (card.user_status === 2) {
              console.log(chalk.gray(`⏭️ Card with task_id ${card.task_id} is already activated (user_status = 2). Skipping.`));
            } else {
              console.log(chalk.gray(`⏭️ Skipping card with task_id ${card.task_id} (user_status = ${card.user_status}).`));
            }
          }
        }
      }

      console.log(chalk.green('✅ Finished processing all accounts and cards.'));
      console.log(chalk.yellow('⏳ Waiting for 4 hours 10 minutes before repeating the process...'));
      await new Promise(resolve => setTimeout(resolve, (4 * 60 * 60 + 10 * 60) * 1000)); // 4 hours 10 minutes delay
    } catch (error) {
      console.error(chalk.red('❌ Error in activating all open cards:'), error.message);
    }
  }
}

// Start the process
printHeader();
activateAllOpenCards();
