const { Client, GatewayIntentBits } = require('discord.js')
const ytdl = require("ytdl-core-discord")
const axios = require('axios')
const fs = require('fs')
const tts = require('./voice-rss-tts/index.js')
const dcVoice = require('@discordjs/voice')

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] })

let queue = []
var playingState
var looping = false

var player
let guildId = process.env.PRODUCTION == 'true' ? '392553285971869697' : '791892898878324768'
let logGuildChannelId = process.env.PRODUCTION == 'true' ? '792953446856261632' : '908148000155648072'
let startupDelay = process.env.PRODUCTION == 'true' ? 5000 : 0

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`)

  client.channels.cache.get(logGuildChannelId).send(':sunny: 成功连接到服务器。')
})

client.on('messageCreate', async (message) => {
  try {
    let command = message.content.toLowerCase()
    if (message.author.bot || !command.startsWith('!y')) return

    let commands = command.split(' ')

    if (commands.length <= 1) {
      message.channel.send(`<@${message.author.id}> 无法识别指令 **${message.content}**。请运行!y help查看指令说明。`)
      return
    }

    if (commands.length >= 3 && (commands[1] == 'play' || commands[1] == 'p')) {
      let voiceChannel = message.member.voice.channel
      if (!voiceChannel) {
        return message.channel.send(`<@${message.author.id}> 你必须加入一个语音频道才能使用此指令。`)
      }

      if (playingState && playingState.channedId != voiceChannel.id) {
        return message.channel.send(`<@${message.author.id}> 当前正在**${playingState.channelName}**频道播放音乐。只有播放完成之后才能切换频道。请通过\`yf play\`使用另外一个bot播放音乐。`)
      }

      let keyword = message.content.split(' ').slice(2, commands.length).join(' ')
      let trackUrl = ''
      if (keyword.includes('www.youtube.com') || keyword.includes('youtu.be')) {
          trackUrl = keyword
      } else {
        try {
          let response = await axios.get('https://yaofenggaming.com/api/search-music/' + encodeURIComponent(keyword))
          trackUrl = response.data
        } catch (err) {
          return message.channel.send(`<@${message.author.id}> 暂时无法使用歌曲名播放音乐。请使用YouTube链接。`)
        }
      }

      let songInfo = await ytdl.getInfo(trackUrl)
      let song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      }
      
      queue.push(song)
      message.channel.send(`<@${message.author.id}> 歌曲**${song.title}**已加入播放队列。`)

      if (!playingState) {
        playingState = {
          channedId:voiceChannel.id,
          channelName: voiceChannel.name
        }
        play(voiceChannel)
      }
    } else if (commands[1] == 'loop') {
      looping = true
    } else if (commands[1] == 'skip') {
      looping = false
      if (player != null) player.stop()
    } else if (commands[1] == 'stop') {
      queue = []
      if (player != null) player.stop()
    } else if (commands[1] == 'queue' || commands[1] == 'q') {
      if (queue.length == 0) {
        message.channel.send({embeds: [{
          title: '当前播放队列',
          description: '当前播放队列中没有歌曲。使用以下指令添加歌曲到播放列表。 \n`!y play 歌曲名或者Youtube网址`'
        }]})
      } else {
        let count = 1
        let description = ''
        for (song of queue) {
          let text = `${count}. [${song.title}](${song.url})`
          if (count == 1) {
            if (looping) {
              text += '（正在循环播放）'
            } else {
              text += '（正在播放）'
            }
          }
          text += '\n'

          if (description.length + text.length < 1900) {
            description += text
            count++
          } else {
            description += `\n还有${queue.length - count + 1}首歌曲。`
            break
          }
        }

        message.channel.send({embeds: [{
          title: '当前播放队列',
          description: description
        }]})
      }
    } else if (commands[1] == 'help' || commands[1] == 'h') {
      message.channel.send({embeds: [{
        title: '妖风电竞 bot指令',
        description: '**唱歌：**`!y play 关键字或者YouTube歌曲链接` or `!y p 歌曲名`\n' +
        '**显示当前播放队列：**`!y queue` or `!y q`\n' +
        '**循环或取消循环当前歌曲：**`!y loop`\n' +
        '**跳过当前正在播放的歌曲：**`!y skip`\n' +
        '**停止播放并清空播放队列：**`!y stop`\n'
      }]})
    } else if (commands[1] == 'ping') {
      return message.channel.send(`Bot operational. Latency ${client.ws.ping} ms`)
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

      if (playingState && playingState.channedId != voiceChannel.id) {
        return message.channel.send(`<@${message.author.id}> 当前正在**${playingState.channelName}**频道播放音乐。只有播放完成之后才能切换频道。请通过\`yf play\`使用另外一个bot播放音乐。`)
      }

      await dcVoice.joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      })
    } else {
      return message.channel.send(`<@${message.author.id}> 无法识别指令 **${message.content}**。请运行!y help查看指令说明。`)
    }
    
  } catch (err) {
    console.error(err)
    return message.channel.send(`错误 ${err}`)
  }
})

async function play(voiceChannel) {
  const connection = await dcVoice.joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  })
  if (queue.length > 0) {
    let song = queue[0]
    var stream = await ytdl(song.url, {filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1<<25 })
    player = dcVoice.createAudioPlayer()
    connection.subscribe(player)
    player.play(dcVoice.createAudioResource(stream, { inputType: dcVoice.StreamType.Opus }))

    // player.on(dcVoice.AudioPlayerStatus.Playing, () => console.log('playing'))
    // player.on(dcVoice.AudioPlayerStatus.Buffering, () => console.log('Buffering'))
    // player.on(dcVoice.AudioPlayerStatus.Paused, () => console.log('Paused'))
    // player.on(dcVoice.AudioPlayerStatus.AutoPaused, () => console.log('AutoPaused'))

    player.on('error', error => {
      queue = []
      playingState = null
      console.error(error)
    })

    player.on(dcVoice.AudioPlayerStatus.Idle, () => {
      if (looping && queue.length > 0) {
        play(voiceChannel)
      } else if (queue.length == 0) {
        looping = false
        playingState = null
      } else {
        queue.shift()
        play(voiceChannel)
      }
    })
  } else {
    looping = false
    playingState = null
  }
}

async function say(message, commands, language) {
  let content = message.content.split(' ').slice(2, commands.length).join(' ')
  if (content == null || content == '') {
    return message.channel.send(`<@${message.author.id}> 请输入要说的话。`)
  }

  let voiceChannel = message.member.voice.channel
      if (!voiceChannel) {
        return message.channel.send(`<@${message.author.id}> 你必须加入一个语音频道才能使用此指令。`)
      } else if (playingState) {
        return message.channel.send(`<@${message.author.id}> 当前正在**${playingState.channelName}**频道播放音乐。只有播放完成之后才能说话。请通过\`yf say${language} ${content}\`使用另外一个bot说话。`)
      }

      if (!fs.existsSync('./temp')){
        fs.mkdirSync('./temp')
      }

      let timestamp = new Date().getTime()
      let soundPath = process.env.PRODUCTION == 'true' ? `/media/internal/tools/tts/${timestamp}.wav` : `F:/music/temp/${timestamp}.wav`//`./temp/${timestamp}.wav`

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
            return console.log(err)
          }

          fs.writeFile(soundPath, content, async function(err) {
            if(err) {
                return console.log(err)
            }

            let delay = 0
            if (client.voice.adapters.get(guildId) == undefined) {
              delay = 500
            }

            let connection = await dcVoice.joinVoiceChannel({
              channelId: voiceChannel.id,
              guildId: voiceChannel.guildId,
              adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            })

            setTimeout(async function() {
              let player = dcVoice.createAudioPlayer()
              connection.subscribe(player)
              player.play(dcVoice.createAudioResource(soundPath, { inputType: dcVoice.StreamType.Opus }))

              player.on('error', error => {
                console.error(error)
                fs.unlinkSync(soundPath)
              })
              player.on(dcVoice.AudioPlayerStatus.Idle, () => {
                fs.unlinkSync(soundPath)
              })

            }, delay)
          })
        }
      })
}

setTimeout(function() { client.login(process.env.DC_MUSIC_BOT_TOKEN) }, startupDelay)

