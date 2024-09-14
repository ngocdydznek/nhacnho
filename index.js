require('dotenv').config();
const { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http'); // Thêm HTTP để giữ bot hoạt động
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Đọc nhắc nhở từ tệp JSON
const remindersPath = path.join(__dirname, 'reminders.json');
let reminders = [];

// Khi bot sẵn sàng
client.once('ready', () => {
  console.log('Bot is online!');
  loadReminders();
  registerCommands();
  checkReminders();
  keepAlive(); // Giữ bot hoạt động
});

// Đọc nhắc nhở từ tệp JSON
const loadReminders = () => {
  try {
    const data = fs.readFileSync(remindersPath);
    reminders = JSON.parse(data);
  } catch (error) {
    console.error('Error loading reminders:', error);
  }
};

// Cập nhật nhắc nhở vào tệp JSON
const saveReminders = () => {
  try {
    fs.writeFileSync(remindersPath, JSON.stringify(reminders, null, 2));
  } catch (error) {
    console.error('Error saving reminders:', error);
  }
};

// Đăng ký lệnh slash
const registerCommands = async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [
        {
          name: 'nhac',
          description: 'Nhắc nhở người dùng về sản phẩm',
          options: [
            {
              type: 3, // STRING
              name: 'ngay',
              description: 'Ngày nhắc nhở (ví dụ: 15/09/2024)',
              required: true,
            },
            {
              type: 6, // USER
              name: 'nguoi_dung',
              description: 'Người dùng nhận nhắc nhở',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'san_pham',
              description: 'Sản phẩm cần nhắc nhở',
              required: true,
            },
          ],
        },
      ],
    });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error refreshing application (/) commands:', error);
  }
};

// Xử lý lệnh slash
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === 'nhac') {
    const ngay = options.getString('ngay');
    const nguoiDung = options.getUser('nguoi_dung');
    const sanPham = options.getString('san_pham');

    // Tách ngày/tháng/năm và tạo đối tượng Date
    const [day, month, year] = ngay.split('/');
    const now = new Date(); // Lấy giờ hiện tại
    const reminderTime = new Date(`${year}-${month}-${day}T${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}Z`);

    // Thêm nhắc nhở vào danh sách và lưu vào tệp JSON
    reminders.push({ reminderTime: reminderTime.toISOString(), nguoiDung: nguoiDung.id, sanPham, sent: false });
    saveReminders();

    const embed = new EmbedBuilder()
      .setTitle('Nhắc Nhở')
      .setDescription(`Ngày: ${ngay}\nGiờ: ${now.getHours()}:${now.getMinutes()}\nNgười dùng: ${nguoiDung}\nSản phẩm: ${sanPham}`)
      .setColor('#00FF00');

    await interaction.reply({ content: 'Nhắc nhở đã được thêm vào!', ephemeral: true });
  }
});

// Kiểm tra nhắc nhở định kỳ
const checkReminders = () => {
  setInterval(async () => {
    const now = new Date();
    reminders.forEach(async (reminder, index) => {
      const reminderTime = new Date(reminder.reminderTime);
      if (!reminder.sent && now >= reminderTime) {
        const channel = client.channels.cache.get('1284585212461973618'); // Thay CHANNEL_ID bằng ID của kênh bạn muốn gửi tin nhắn
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle('Nhắc Nhở')
            .setDescription(`Sản phẩm: ${reminder.sanPham}\nNgười dùng: <@${reminder.nguoiDung}>`)
            .setColor('#00FF00');
          
          await channel.send({ embeds: [embed] });
          reminders[index].sent = true; // Đánh dấu nhắc nhở đã gửi
          saveReminders();
        }
      }
    });
  }, 60000); // Kiểm tra mỗi phút
};

// Giữ bot hoạt động 24/7
const keepAlive = () => {
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is alive!');
  }).listen(3000, () => {
    console.log('Server is ready on port 3000');
  });
};

// Đăng nhập bot
client.login(process.env.DISCORD_TOKEN);
