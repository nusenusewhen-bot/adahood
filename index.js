require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, Events, Partials } = require('discord.js');
const Database = require('better-sqlite3');

// Database
const db = new Database('bot.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, channel_id TEXT, creator_id TEXT, claimed_by TEXT, type TEXT, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.Message]
});

const getConfig = (key) => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
};

const setConfig = (key, value) => {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
};

const isStaff = (member) => {
  if (!member) return false;
  const staffRole = getConfig('staff_role');
  if (!staffRole) return false;
  return member.roles.cache.has(staffRole);
};

const isAdmin = (member) => {
  return member.permissions.has(PermissionFlagsBits.Administrator);
};

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  const commands = [
    { name: 'mm1', description: 'Set MM 200$ role', options: [{ name: 'role', type: 8, description: 'Role', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'mm2', description: 'Set MM 500$ role', options: [{ name: 'role', type: 8, description: 'Role', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'mm3', description: 'Set MM 1000$+ role', options: [{ name: 'role', type: 8, description: 'Role', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'mm1cat', description: 'Set MM 200$ category', options: [{ name: 'category', type: 7, description: 'Category', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'mm2cat', description: 'Set MM 500$ category', options: [{ name: 'category', type: 7, description: 'Category', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'mm3cat', description: 'Set MM 1000$+ category', options: [{ name: 'category', type: 7, description: 'Category', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'supportcat', description: 'Set support category', options: [{ name: 'category', type: 7, description: 'Category', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'reportcat', description: 'Set report category', options: [{ name: 'category', type: 7, description: 'Category', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'staff', description: 'Set staff role', options: [{ name: 'role', type: 8, description: 'Role', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'transcript', description: 'Generate transcript', options: [{ name: 'channel', type: 7, description: 'Channel', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator },
    { name: 'banlog', description: 'Set ban log channel', options: [{ name: 'channel', type: 7, description: 'Channel', required: true }], defaultMemberPermissions: PermissionFlagsBits.Administrator }
  ];
  
  await client.application.commands.set(commands);
  console.log('✅ Commands registered');
});

// Slash commands (setup only)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, guild, member } = interaction;

  try {
    if (commandName === 'mm1') { setConfig('mm1_role', options.getRole('role').id); await interaction.reply({ content: '✅ MM 200$ role set', ephemeral: true }); }
    if (commandName === 'mm2') { setConfig('mm2_role', options.getRole('role').id); await interaction.reply({ content: '✅ MM 500$ role set', ephemeral: true }); }
    if (commandName === 'mm3') { setConfig('mm3_role', options.getRole('role').id); await interaction.reply({ content: '✅ MM 1000$+ role set', ephemeral: true }); }
    if (commandName === 'mm1cat') { setConfig('mm1_cat', options.getChannel('category').id); await interaction.reply({ content: '✅ MM 200$ category set', ephemeral: true }); }
    if (commandName === 'mm2cat') { setConfig('mm2_cat', options.getChannel('category').id); await interaction.reply({ content: '✅ MM 500$ category set', ephemeral: true }); }
    if (commandName === 'mm3cat') { setConfig('mm3_cat', options.getChannel('category').id); await interaction.reply({ content: '✅ MM 1000$+ category set', ephemeral: true }); }
    if (commandName === 'supportcat') { setConfig('support_cat', options.getChannel('category').id); await interaction.reply({ content: '✅ Support category set', ephemeral: true }); }
    if (commandName === 'reportcat') { setConfig('report_cat', options.getChannel('category').id); await interaction.reply({ content: '✅ Report category set', ephemeral: true }); }
    if (commandName === 'staff') { setConfig('staff_role', options.getRole('role').id); await interaction.reply({ content: `✅ Staff role set to ${options.getRole('role')}`, ephemeral: true }); }
    if (commandName === 'transcript') {
      const channel = options.getChannel('channel');
      const messages = await channel.messages.fetch({ limit: 100 });
      let transcript = `**Transcript for #${channel.name}**\n\n`;
      messages.reverse().forEach(msg => { transcript += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`; });
      await interaction.reply({ content: `📄 Transcript for ${channel.name}`, files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `transcript-${channel.name}.txt` }], ephemeral: true });
    }
    if (commandName === 'banlog') { setConfig('banlog_channel', options.getChannel('channel').id); await interaction.reply({ content: '✅ Ban log channel set', ephemeral: true }); }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Error occurred', ephemeral: true }).catch(() => {});
  }
});

// Select menus
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  const { customId, values, guild, user } = interaction;
  const value = values[0];

  if (customId === 'gamble_select' || customId === 'support_select') {
    const isGamble = customId === 'gamble_select';
    const tier = value;
    
    if (isGamble && !getConfig(`${tier}_role`)) return interaction.reply({ content: '❌ This tier not configured', ephemeral: true });

    const categoryId = getConfig(isGamble ? `${tier}_cat` : `${tier}_cat`);
    if (!categoryId) return interaction.reply({ content: '❌ Category not set', ephemeral: true });

    const mmRoleId = isGamble ? getConfig(`${tier}_role`) : getConfig('staff_role');
    const mmRole = mmRoleId ? guild.roles.cache.get(mmRoleId) : null;

    const ticketNum = Date.now().toString(36).toUpperCase();
    const channelName = isGamble ? `gamble-${ticketNum}` : `${tier}-${ticketNum}`;

    const perms = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ];
    if (mmRole) perms.push({ id: mmRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

    try {
      const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: categoryId, permissionOverwrites: perms });
      db.prepare('INSERT INTO tickets (channel_id, creator_id, type, status) VALUES (?, ?, ?, ?)').run(channel.id, user.id, tier, 'open');

      const embed = new EmbedBuilder().setTitle(`🎫 ${isGamble ? 'Gambling' : 'Support'} Ticket`).setDescription(`Welcome <@${user.id}>\n\n${isGamble ? 'A middleman will assist you shortly.' : 'Staff will be with you shortly.'}`).setColor(isGamble ? 0x5865F2 : 0x57F287).addFields({ name: 'Type', value: tier.toUpperCase(), inline: true }, { name: 'Status', value: '🔴 Unclaimed', inline: true }).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋'),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
      );

      await channel.send({ content: `<@${user.id}>${mmRole ? ` <@&${mmRole.id}>` : ''}`, embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Failed to create ticket', ephemeral: true });
    }
  }
});

// Buttons
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId, channel, member, guild } = interaction;

  try {
    if (customId === 'claim_ticket') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id);
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found', ephemeral: true });

      let hasPerm = false;
      if (ticket.type.startsWith('mm')) {
        const mmRole = getConfig(`${ticket.type}_role`);
        hasPerm = mmRole && member.roles.cache.has(mmRole);
      } else {
        hasPerm = isStaff(member);
      }

      if (!hasPerm) return interaction.reply({ content: '❌ No permission', ephemeral: true });
      if (ticket.claimed_by) return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimed_by}>`, ephemeral: true });

      db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?').run(member.id, channel.id);

      const messages = await channel.messages.fetch({ limit: 10 });
      const firstMsg = messages.find(m => m.embeds.length > 0 && m.components.length > 0);
      
      if (firstMsg) {
        const newEmbed = EmbedBuilder.from(firstMsg.embeds[0]).spliceFields(1, 1, { name: 'Status', value: `🟢 Claimed by <@${member.id}>`, inline: true });
        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('Unclaim').setStyle(ButtonStyle.Secondary).setEmoji('👋'),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );
        await firstMsg.edit({ embeds: [newEmbed], components: [newRow] });
      }
      await interaction.reply({ content: `✅ Claimed by ${member}`, allowedMentions: { parse: [] } });
    }

    if (customId === 'unclaim_ticket') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id);
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
      if (ticket.claimed_by !== member.id && !member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Only claimant or admin', ephemeral: true });

      db.prepare('UPDATE tickets SET claimed_by = NULL WHERE channel_id = ?').run(channel.id);

      const messages = await channel.messages.fetch({ limit: 10 });
      const firstMsg = messages.find(m => m.embeds.length > 0 && m.components.length > 0);
      
      if (firstMsg) {
        const newEmbed = EmbedBuilder.from(firstMsg.embeds[0]).spliceFields(1, 1, { name: 'Status', value: '🔴 Unclaimed', inline: true });
        const newRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✋'),
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );
        await firstMsg.edit({ embeds: [newEmbed], components: [newRow] });
      }
      await interaction.reply({ content: '✅ Unclaimed' });
    }

    if (customId === 'close_ticket') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id);
      if (!ticket) return interaction.reply({ content: '❌ Ticket not found', ephemeral: true });

      const canClose = ticket.creator_id === member.id || ticket.claimed_by === member.id || member.permissions.has(PermissionFlagsBits.Administrator) || isStaff(member);
      if (!canClose) return interaction.reply({ content: '❌ Cannot close', ephemeral: true });

      db.prepare('UPDATE tickets SET status = ? WHERE channel_id = ?').run('closed', channel.id);
      await interaction.reply({ content: '🔒 Closing in 5 seconds...' });
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Error', ephemeral: true }).catch(() => {});
  }
});

// PREFIX COMMANDS - FIXED STRUCTURE
client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  
  const content = message.content;
  
  // ========== - COMMANDS (GAMBLING) ==========
  if (content.startsWith('-')) {
    const args = content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // -roll command
    if (command === 'roll') {
      const die1 = Math.floor(Math.random() * 6) + 1;
      const die2 = Math.floor(Math.random() * 6) + 1;
      
      const embed = new EmbedBuilder()
        .setTitle("Da Hood Casino's Dice Roll (6-sided)")
        .setDescription(`🎲 ${message.member.displayName} rolled ${die1} & ${die2}`)
        .setColor(0x2B2D31);
      
      return message.reply({ embeds: [embed] });
    }
    
    // -coinflip command
    if (command === 'coinflip') {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      
      const embed = new EmbedBuilder()
        .setTitle("Coin Flip")
        .setDescription(`🪙 ${message.member.displayName} flipped **${result}**`)
        .setColor(0x2B2D31);
      
      return message.reply({ embeds: [embed] });
    }
    
    // -spin command
    if (command === 'spin') {
      if (args.length < 2) {
        return message.reply('❌ Usage: `-spin option1 option2` (minimum 2 options)');
      }
      
      const winner = args[Math.floor(Math.random() * args.length)];
      
      const embed = new EmbedBuilder()
        .setTitle("🎡 Wheel Spin")
        .setDescription(`${message.member.displayName} spun the wheel...\n\n**Winner:** ${winner}`)
        .addFields({ name: 'Options', value: args.join(', '), inline: false })
        .setColor(0x2B2D31);
      
      return message.reply({ embeds: [embed] });
    }
    
    return; // Stop here for - commands
  }
  
  // ========== $ COMMANDS (ADMIN PANELS) ==========
  if (content.startsWith('$')) {
    const args = content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    // $panel - Gambling ticket panel
    if (command === 'panel') {
      if (!isAdmin(message.member)) return message.reply('❌ Admin only');
      
      const embed = new EmbedBuilder()
        .setTitle('Gambling Middleman Service')
        .setDescription('Select a tier to create a ticket')
        .setColor(0x5865F2);
      
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('gamble_select')
          .setPlaceholder('Select Middleman Tier')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Middleman 200$ or under')
              .setDescription('For trades $200 and below')
              .setValue('mm1'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Middleman 500$ and under')
              .setDescription('For trades $500 and below')
              .setValue('mm2'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Middleman over 1000$+')
              .setDescription('For high value trades $1000+')
              .setValue('mm3')
          )
      );
      
      return message.channel.send({ embeds: [embed], components: [row] });
    }
    
    // $supportpanel - Support ticket panel
    if (command === 'supportpanel') {
      if (!isAdmin(message.member)) return message.reply('❌ Admin only');
      
      const embed = new EmbedBuilder()
        .setTitle('Support Center')
        .setDescription('Need help? Select an option below')
        .setColor(0x57F287);
      
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('support_select')
          .setPlaceholder('Select Support Type')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('General Support')
              .setDescription('Get help with general inquiries')
              .setValue('support'),
            new StringSelectMenuOptionBuilder()
              .setLabel('Report User')
              .setDescription('Report a user for breaking rules')
              .setValue('report')
          )
      );
      
      return message.channel.send({ embeds: [embed], components: [row] });
    }
    
    return; // Stop here for $ commands
  }
  
  // ========== . COMMANDS (STAFF MODERATION) ==========
  if (content.startsWith('.')) {
    const args = content.slice(1).trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    
    if (!isStaff(message.member)) return;

    try {
      if (command === 'ban') {
        let target = message.mentions.members.first();
        let userId = args[0]?.replace(/[<@!>]/g, '');
        
        if (!target && userId) {
          target = await message.guild.members.fetch(userId).catch(() => null);
        }
        
        if (!target) return message.reply('❌ User not found. Use: `.ban @user` or `.ban userID`');
        
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
          return message.reply('❌ Bot lacks "Ban Members" permission');
        }
        
        if (message.guild.members.me.roles.highest.position <= target.roles.highest.position) {
          return message.reply('❌ Bot role must be higher than target user\'s role');
        }
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.ban({ reason });
        
        const logChannelId = getConfig('banlog_channel');
        if (logChannelId) {
          const logCh = message.guild.channels.cache.get(logChannelId);
          if (logCh) {
            const embed = new EmbedBuilder()
              .setTitle('🔨 Ban')
              .setDescription(`**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`)
              .setColor(0xED4245)
              .setTimestamp();
            await logCh.send({ embeds: [embed] });
          }
        }
        
        return message.reply(`✅ Banned **${target.user.tag}** | Reason: ${reason}`);
      }

      if (command === 'unban') {
        const userId = args[0]?.replace(/[<@!>]/g, '');
        if (!userId) return message.reply('❌ Provide user ID: `.unban userID`');
        
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
          return message.reply('❌ Bot lacks "Ban Members" permission');
        }
        
        await message.guild.members.unban(userId);
        
        const logChannelId = getConfig('banlog_channel');
        if (logChannelId) {
          const logCh = message.guild.channels.cache.get(logChannelId);
          if (logCh) {
            const embed = new EmbedBuilder()
              .setTitle('🔓 Unban')
              .setDescription(`**User ID:** ${userId}\n**Moderator:** ${message.author.tag}`)
              .setColor(0x57F287)
              .setTimestamp();
            await logCh.send({ embeds: [embed] });
          }
        }
        
        return message.reply(`✅ Unbanned user ID: **${userId}**`);
      }

      if (command === 'kick') {
        let target = message.mentions.members.first();
        let userId = args[0]?.replace(/[<@!>]/g, '');
        
        if (!target && userId) {
          target = await message.guild.members.fetch(userId).catch(() => null);
        }
        
        if (!target) return message.reply('❌ User not found. Use: `.kick @user` or `.kick userID`');
        
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
          return message.reply('❌ Bot lacks "Kick Members" permission');
        }
        
        if (message.guild.members.me.roles.highest.position <= target.roles.highest.position) {
          return message.reply('❌ Bot role must be higher than target user\'s role');
        }
        
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.kick(reason);
        
        const logChannelId = getConfig('banlog_channel');
        if (logChannelId) {
          const logCh = message.guild.channels.cache.get(logChannelId);
          if (logCh) {
            const embed = new EmbedBuilder()
              .setTitle('👢 Kick')
              .setDescription(`**User:** ${target.user.tag} (${target.id})\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`)
              .setColor(0xFEE75C)
              .setTimestamp();
            await logCh.send({ embeds: [embed] });
          }
        }
        
        return message.reply(`✅ Kicked **${target.user.tag}** | Reason: ${reason}`);
      }
    } catch (err) {
      console.error(`[ERROR] ${command}:`, err);
      return message.reply(`❌ Error: ${err.message}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
