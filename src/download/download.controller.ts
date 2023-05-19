import * as ytdl from 'ytdl-core-discord';
import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';

@Controller('download')
export class DownloadController {
  @Get()
  async downloadVideo(
    @Req() req: Request,
    @Query('url') url: string,
    @Query('title') title: string,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(400).send('URL is required');
    }

    if (ytdl.validateURL(url)) {
      try {
        const videoInfo = await ytdl.getBasicInfo(url);
        const videoTitle = videoInfo.videoDetails.title.replace(
          /[^a-zA-Z0-9-_]/g,
          '_',
        );
        const videoFormat = ytdl.chooseFormat(videoInfo.formats, {
          quality: 'lowest',
        });

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${videoTitle}.mp4"`,
        );
        const videoReadableStream = await ytdl(url, { format: videoFormat });
        videoReadableStream.on('error', (err) => {
          console.error(err);
          res.status(500).send('Something went wrong');
        });
        videoReadableStream.pipe(res);
      } catch (error) {
        console.error(error);
        return res.status(500).send('Something went wrong');
      }
    } else {
      // Download from other websites
      try {
        if (!title) {
          return res.status(400).send('Title is required for non-YouTube URLs');
        }

        const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${sanitizedTitle}.mp4"`,
        );

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
          );
        }
        response.body.pipe(res);
      } catch (error) {
        console.error(error);
        return res.status(500).send('Something went wrong');
      }
    }
  }

  @Post('mp3')
  async downloadAudio(@Req() req, @Res() res) {
    const videoId = req.body.url.split('=')[1];
    console.log(videoId);
    if (!videoId) {
      return res.status(400).send('Video ID is required');
    } else {
      try {
        const fetchAPI = await fetch(
          `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
          {
            method: 'POST',
            headers: {
              'x-rapidapi-key': process.env.API_KEY,
              'x-rapidapi-host': process.env.API_HOST,
            },
          },
        );
        const fetchResponse = await fetchAPI.json();
        if (fetchResponse.status === 'ok') {
          return res.status(200).send(fetchResponse);
        } else {
          return res.status(400).send(fetchResponse);
        }
      } catch (error) {
        return res.status(500).send(error.message);
      }
    }
  }
}
