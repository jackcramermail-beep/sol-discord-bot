const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const { getWallet, saveWallet, decrypt } = require('./db');
const { generateWallet, getBalance, withdraw } = require('./solana');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder().setName('deposit').setDescription('Get your deposit address'),
  new SlashCommandBuilder().setName('balance').setDescription('Check your balance'),
  new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw SOL to an address')
    .addStringOption((o) =>
      o.setName('address').setDescription('Destination Solana address').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('amount').setDescription('Amount in SOL').setRequired(true)
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  try {
    if (interaction.commandName === 'deposit') {
      let wallet = getWallet(userId);
      if (!wallet) {
        const { publicKey, secretKey } = generateWallet();
        saveWallet(userId, publicKey, secretKey);
        wallet = { public_key: publicKey };
      }
      const embed = new EmbedBuilder()
        .setTitle('Your Deposit Address')
        .setDescription(`\`${wallet.public_key}\``)
        .setFooter({ text: 'Send only SOL to this address.' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.commandName === 'balance') {
      const wallet = getWallet(userId);
      if (!wallet) {
        return interaction.reply({
          content: 'Run /deposit first to create a wallet.',
          ephemeral: true,
        });
      }
      const bal = await getBalance(wallet.public_key);
      await interaction.reply({ content: `Your balance: **${bal} SOL**`, ephemeral: true });
    }

    if (interaction.commandName === 'withdraw') {
      const wallet = getWallet(userId);
      if (!wallet) {
        return interaction.reply({
          content: 'Run /deposit first to create a wallet.',
          ephemeral: true,
        });
      }

      const address = interaction.options.getString('address');
      const amount = interaction.options.getNumber('amount');

      const bal = await getBalance(wallet.public_key);
      // leave a small buffer for tx fees
      if (amount + 0.000005 > bal) {
        return interaction.reply({
          content: `Insufficient balance. You have ${bal} SOL.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const secretKeyArray = JSON.parse(decrypt(wallet.encrypted_secret));
      const sig = await withdraw(secretKeyArray, address, amount);
      await interaction.editReply(`Sent ${amount} SOL. Tx: https://solscan.io/tx/${sig}`);
    }
  } catch (err) {
    console.error(err);
    const msg = { content: 'Something went wrong. Please try again.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(msg);
    else await interaction.reply(msg);
  }
});

client.login(process.env.DISCORD_TOKEN);
