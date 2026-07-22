import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Production: pin to CORS_ORIGIN. Dev: allow any localhost port, since Vite drifts
  // to 5174/5175… whenever 5173 is taken (JWT is header-based, so no cookie exposure).
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN
      : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
