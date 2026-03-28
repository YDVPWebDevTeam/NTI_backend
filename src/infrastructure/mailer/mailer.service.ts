import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config';

import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.smtpHost,
      port: this.configService.smtpPort,
      secure: false,
      auth: {
        user: this.configService.smtpUser,
        pass: this.configService.smtpPassword,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.smtpFrom,
        to,
        subject,
        html,
      });
    } catch (error: unknown) {
      console.error('Email sending error', {
        to,
        subject,
        error,
      });

      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const link = `${this.configService.frontUrl}/confirm?token=${token}`;

    const html = `
        <h1>Hello, please confirm your email adress via this link </h1>
        <p>click the link</p>
        <a href="${link}">${link}</a>
        `;

    await this.sendEmail(email, 'Email confirmation', html);
  }

  async sendTeamConfirm(
    email: string,
    teamName: string,
    token: string,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/invite?token=${token}`;

    const html = `
        <h1>Team invitation</h1>

        <p>Hey, you have been invited to: <b>${teamName}</b></p>

        <a href="${link}">Confirm invitation</a>

        `;

    await this.sendEmail(email, 'Team Invitation', html);
  }
}
