import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { fastifyMultipart } from "@fastify/multipart";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

import { pipeline } from "node:stream";

/* Uma grande vantagem do node ( um dos motivos que ele se popularizou) foi que ele permite que gravemos os dados
por partes, salvando diretamente no disco ( antigamente mantinha na memória até acabar e dps salvava) 
Antigamente usava-se callbacks para notificar quando acabava, agora temos recursos mais modernos como promises e async/await
esse promisify transforma uma função que usa callbacks em uma função que usa promises */
import { promisify } from "node:util";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    },
  });

  app.post("/videos", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: "Missing file input",
      });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return reply.status(400).send({
        error: "Invalid input type, please upload a mp3 file",
      });
    }

    const fileBaseName = path.basename(data.filename, extension);

    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return { video };
  });
}
