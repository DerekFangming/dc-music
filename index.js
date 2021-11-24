const { Client, Intents } = require('discord.js')
const ytdl = require("ytdl-core")
const axios = require('axios')
const fs = require('fs')
const tts = require('./voice-rss-tts/index.js')
// const token = process.argv.slice(2) == '' ? process.env.TL_DC_BOT_TOKEN : process.env.DC_MUSIC_BOT_TOKEN; //test

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

let queue = [];
var playing = false;
var looping = false;

var player;
let guildId = process.env.PRODUCTION == 'true' ? '392553285971869697' : '791892898878324768';

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

      if (playing && client.voice.connections.get(guildId) != undefined) {
        if (voiceChannel.id != client.voice.connections.get(guildId).channel.id) {
          return message.channel.send(`<@${message.author.id}> 当前正在**${voiceChannel.name}**频道播放音乐。只有播放完成之后才能切换频道。请通过yf使用另外一个bot播放音乐。`);
        }
      }

      let keyword = message.content.split(' ').slice(2, commands.length).join(' ');
      let trackUrl = '';
      if (keyword.includes('www.youtube.com') || keyword.includes('youtu.be')) {
          trackUrl = keyword;
      } else {
        try {
          let response = await axios.get('https://fmning.com/tools/api/discord/search_music/' + encodeURIComponent(keyword))
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
      say(message, commands, '')
    } else if (commands[1] == 'sayj' || commands[1] =='sj') {
      say(message, commands, 'j')
    } else if (commands[1] == 'saym' || commands[1] =='sm') {
      say(message, commands, 'm')
    } else if (commands[1] == 'sayc' || commands[1] =='sc') {
      say(message, commands, 'c')
    } else if (commands[1] == 'saye' || commands[1] =='se') {
      say(message, commands, 'e')
    } else if (commands[1] == 'come') {
      let voiceChannel = message.member.voice.channel
      if (!voiceChannel) {
        return
      }

      if (playing && client.voice.connections.get(guildId) != undefined) {
        if (voiceChannel.id != client.voice.connections.get(guildId).channel.id) {
          return message.channel.send(`<@${message.author.id}> 当前正在**${voiceChannel.name}**频道播放音乐。只有播放完成之后才能切换频道。请通过yf使用另外一个bot播放音乐。`);
        }
      }
      await voiceChannel.join();
    } else {
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

async function say(message, commands, language) {
  let voiceChannel = message.member.voice.channel
      if (!voiceChannel) {
        return message.channel.send(`<@${message.author.id}> 你必须加入一个语音频道才能使用此指令。`);
      } else if (playing) {
        let currentConnection = client.voice.connections.get(guildId);
        let channelName = currentConnection != undefined ? "**" + currentConnection.channel.name + "**" : "";
        return message.channel.send(`<@${message.author.id}> 当前正在**${channelName}**频道播放音乐。只有播放完成之后才能说话。请通过yf使用另外一个bot说话。`);
      }

      let content = message.content.split(' ').slice(2, commands.length).join(' ');
      if (!fs.existsSync('./temp')){
        fs.mkdirSync('./temp');
      }

      let timestamp = new Date().getTime();
      let soundPath = process.env.PRODUCTION == 'true' ? `/media/internal/tools/tts/${timestamp}.wav` : `./temp/${timestamp}.wav`

      let voice = null
      if ('e' == language) {
        voice = 'en-us'
      } else if ('m' == language) {
        voice = 'zh-cn'
      } else if ('c' == language) {
        voice = 'zh-hk'
      } else if ('j' == language) {
        voice = 'ja-jp'
      } else {
        if (content.match(/[\u3400-\u9FBF]/) != null ) voice = 'zh-cn'
        else if (content.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/) != null ) voice = 'ja-jp'
        else voice = 'en-us'
      }

      tts.speech({
        key: Math.random() < 0.5 ? '038f9e5ee5c54f899eebccf8aac3847a' : 'b189deef5c194efdaffab21e7c6e4b1a',
        hl: voice,
        src: content,
        r: 0,
        c: 'wav',
        f: '16khz_16bit_mono',
        ssml: false,
        b64: false,
        callback: function (error, content) {
          if (error) {
            return console.log(err);
          }

          fs.writeFile(soundPath, content, async function(err) {
            if(err) {
                return console.log(err);
            }
            let connection;

            let delay = 0;
            if (client.voice.connections.get(guildId) != undefined) {
              if (voiceChannel.id == client.voice.connections.get(guildId).channel.id) {
                connection = client.voice.connections.get(guildId);
              }
            }
            
            if (connection == undefined) {
              connection = await voiceChannel.join();
              delay = 500;
            }

            setTimeout(function() {
              connection.play(soundPath).on('finish', () => {
                fs.unlinkSync(soundPath);
              }).on('error', (err) => {
                console.error(err);
                fs.unlinkSync(soundPath);
              });
            }, delay);
          }); 
        }
      });
}

client.login(process.env.DC_MUSIC_BOT_TOKENA);
