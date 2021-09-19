const { Client, Intents } = require('discord.js');
const ytdl = require("ytdl-core");
const axios = require('axios');
const say = require('say')
var iconv = require('iconv-lite');
const token = process.argv.slice(2) == '' ? process.env.TL_DC_BOT_TOKEN : process.env.DC_MUSIC_BOT_TOKEN;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

let queue = [];
var playing = false;
var looping = false;

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
      } else {
        try {
          let response = await axios.get(`https://fmning.com/tools/api/discord/search_music/${keyword}`)
          trackUrl = response.data;
        } catch (err) {
          return message.channel.send(`<@${message.author.id}> 暂时无法使用歌曲名播放音乐。请使用YouTube链接。`);
        }
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
    } else if (commands[1] == 'loop') {
      looping = true;
    } else if (commands[1] == 'skip') {
      looping = false;
      if (player != null) player.end();
    } else if (commands[1] == 'stop') {
      queue = [];
      if (player != null) player.end();
    } else if (commands[1] == 'queue' || commands[1] == 'q') {
      if (queue.length == 0) {
        message.channel.send({embed: {
          title: '当前播放队列',
          description: '当前播放队列中没有歌曲。使用以下指令添加歌曲到播放列表。 \n`!y play 歌曲名或者Youtube网址`'
        }});
      } else {
        let count = 1;
        let description = '';
        for (song of queue) {
          let text = `${count}. [${song.title}](${song.url})`;
          if (count == 1) {
            if (looping) {
              text += '（正在循环播放）';
            } else {
              text += '（正在播放）';
            }
          }
          text += '\n';

          if (description.length + text.length < 1900) {
            description += text;
            count++;
          } else {
            description += `\n还有${queue.length - count + 1}首歌曲。`;
            break;
          }
        }

        message.channel.send({embed: {
          title: '当前播放队列',
          description: description
        }});
      }
    } else if (commands[1] == 'help' || commands[1] == 'h') {
      message.channel.send({embed: {
        title: '妖风电竞 bot指令',
        description: '**唱歌：**`!y play 关键字或者YouTube歌曲链接` or `!y p 歌曲名`\n' +
        '**显示当前播放队列：**`!y queue` or `!y q`\n' +
        '**循环或取消循环当前歌曲：**`!y loop`\n' +
        '**跳过当前正在播放的歌曲：**`!y skip`\n' +
        '**停止播放并清空播放队列：**`!y stop`\n'
      }});
    } else if (commands[1] == 'ping') {
      return message.channel.send(`Bot operational. Latency ${client.ws.ping} ms`);
    } else if (commands[1] == 'say') {

      let content = message.content.split(' ').slice(2, commands.length).join(' ');
      // if (!FS.existsSync('./temp')){
      //   FS.mkdirSync('./temp');
      // }
      // say.setEncoding('gbk')
      console.log(content);
      buf = iconv.encode(content, 'gbk');
      console.log(buf);
      say.export(content, null, 1, `./temp/hal.wav`, (err) => {
        if (err) {
          return console.error(err)
        }
       
        console.log('Text has been saved to hal.wav.')
      });

      // say.getInstalledVoices(callback => {
      //   console.log(callback);
      // })
    }else {
      return message.channel.send(`<@${message.author.id}> 无法识别指令 **${message.content}**。请运行!y help查看指令说明。`);
    }
    
  } catch (err) {
    console.error(err);
    return message.channel.send(`错误 ${err}`);
  }
});

async function play(voiceChannel) {
  let connection = await voiceChannel.join();
  if (queue.length > 0) {
    let song = queue[0];
    player = connection.play(ytdl(song.url, {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 }))
      .on("finish", () => {
        if (looping && queue.length > 0) {
          play(voiceChannel);
        } else if (queue.length == 0) {
          looping = false;
          playing = false;
        } else {
          queue.shift();
          play(voiceChannel);
        }
      })
      .on("error", error => {
        queue = [];
        playing = false;
        console.error(error);
      });
  } else {
    looping = false;
    playing = false;
  }
}

client.login(token);
 