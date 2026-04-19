import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../config';
import { UserRole } from '../../../generated/prisma/enums';

import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: Transporter;

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.smtpHost,
      port: this.configService.smtpPort,
      secure: this.configService.smtpPort === 465,
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
        <h1>Hello, please confirm your email address via this link </h1>
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

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${this.configService.frontUrl}/reset-password?token=${token}`;

    const html = `
        <h1>Password reset</h1>

        <p>You requested a password reset for your account.</p>
        <p>If this was you, use the link below to choose a new password:</p>

        <a href="${link}">${link}</a>
        `;

    await this.sendEmail(email, 'Password reset', html);
  }

  async sendSystemInvite(
    email: string,
    token: string,
    roleToAssign: UserRole,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/invite?token=${token}`;

    const html = `
        <h1>System invitation</h1>
        <p>You have been invited as <b>${roleToAssign}</b>.</p>
        <a href="${link}">Accept invitation</a>
        `;

    await this.sendEmail(email, 'System Invitation', html);
  }

  async sendOrgInviteEmail(
    email: string,
    token: string,
    organizationName: string,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/invite?token=${token}`;

    const html = `
        <h1>Organization invitation</h1>
        <p>You have been invited to join <b>${organizationName}</b>.</p>
        <a href="${link}">Accept invitation</a>
        `;

    await this.sendEmail(email, 'Organization Invitation', html);
  }

  async sendOrgPendingReviewEmail(
    email: string,
    organizationId: string,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/admin/organizations/${organizationId}`;

    const html = `
      <h1>New organization pending review</h1>

      <p>A new organization has been created and requires review.</p>

      <a href="${link}">Review organization</a>
  `;

    await this.sendEmail(email, 'Organization pending review', html);
  }

  async sendOrgApprovedEmail(
    email: string,
    organizationId: string,
    organizationName: string,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/organization/${organizationId}`;
    const safeOrganizationName = this.escapeHtml(organizationName);

    const html = `
      <h1>Organization approved</h1>

      <p>Your organization <b>${safeOrganizationName}</b> has been approved.</p>

      <a href="${link}">Open organization</a>
  `;

    await this.sendEmail(email, 'Organization approved', html);
  }

  async sendOrgRejectedEmail(
    email: string,
    organizationId: string,
    organizationName: string,
    rejectionReason: string,
  ): Promise<void> {
    const link = `${this.configService.frontUrl}/organization/${organizationId}`;
    const safeOrganizationName = this.escapeHtml(organizationName);
    const safeRejectionReason = this.escapeHtml(rejectionReason);

    const html = `
      <h1>Organization rejected</h1>

      <p>Your organization <b>${safeOrganizationName}</b> was rejected.</p>
      <p><b>Reason:</b> ${safeRejectionReason}</p>

      <a href="${link}">Open organization</a>
  `;

    await this.sendEmail(email, 'Organization rejected', html);
  }
}
