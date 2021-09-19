const { Client, Intents } = require('discord.js');
const ytdl = require("ytdl-core");

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

let queue = [];
var playing = false;

var player;

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
  try {
    let command = message.content.toLowerCase();
    if (message.author.bot || !message.content.startsWith('!y')) return;

    let commands = command.split(' ');

    if (commands.length <= 1) {
      message.channel.send(`<@${message.author.id}> 无法识别指令 **${message.content}**。请运行!y help查看指令说明。`);
      return;
    }

    if (commands.length >= 3 && (commands[1] == 'play' || commands[1] == 'p')) {
      let voiceChannel = message.member.voice.channel
      if (!voiceChannel) {
        return message.channel.send(`<@${message.author.id}> 你必须加入一个语音频道才能使用此指令。`);
      }

      let keyword = message.content.split(' ').slice(2, commands.length).join(' ');
      let trackUrl = '';
      if (keyword.includes('www.youtube.com') || keyword.includes('youtu.be')) {
          trackUrl = keyword;
      }

      let songInfo = await ytdl.getInfo(trackUrl);
      let song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      };
      
      queue.push(song);
      message.channel.send(`<@${message.author.id}> 歌曲**${song.title}**已加入播放队列。`);

      if (!playing) {
        playing = true;
        play(voiceChannel);
      }
    } else if (commands[1] == 'skip') {
      player.end();
    } else if (commands[1] == 'stop') {
      queue = [];
      player.end();
    } else if (commands[1] == 'queue' || commands[1] == 'q') {
      console.log(queue);
    } else if (commands[1] == 'test' || commands[1] == 't') {
    }
    
  } catch (err) {
    console.error(err);
    return message.channel.send(`错误 ${err}`);
  }
});

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}


async function play(voiceChannel) {
  let connection = await voiceChannel.join();
  let song = queue.shift();
  player = connection.play(ytdl(song.url, {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 }))
    .on("finish", () => {
      if (queue.length == 0) {
        playing = false;
      } else {
        play(voiceChannel);
      }
    })
    .on("error", error => {
      queue = [];
      playing = false;
      console.error(error);
    });
}

client.login(process.env.TL_DC_BOT_TOKEN);
 