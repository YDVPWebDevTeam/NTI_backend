import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { createPaginationQueryDecorators } from '../../common/pagination';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { CreateOrganizationInviteDto } from '../dto/create-organization-invite.dto';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { ORGANIZATION_INVITE_SORT_VALUES } from '../dto/get-organization-invites-query.dto';
import { GetOrganizationInvitesResponseDto } from '../dto/get-organization-invites-response.dto';
import { OrganizationInviteValidationResponseDto } from '../dto/organization-invite-validation-response.dto';
import { OrganizationInviteResponseDto } from '../dto/organization-invite-response.dto';
import { OrganizationResponseDto } from '../dto/organization-response.dto';
import { ResendOrganizationInviteResponseDto } from '../dto/resend-organization-invite-response.dto';
import { RevokeOrganizationInviteResponseDto } from '../dto/revoke-organization-invite-response.dto';
import { UpdateOrganizationProfileDto } from '../dto/update-organization-profile.dto';
import { OrganizationMemberResponseDto } from '../dto/organization-member-response.dto';
import { TransferOrganizationOwnerDto } from '../dto/transfer-organization-owner.dto';
import { UpdateOrganizationMemberRoleDto } from '../dto/update-organization-member-role.dto';
import { ValidateOrganizationInviteDto } from '../dto/validate-organization-invite.dto';

export const CreateOrganizationApi = () =>
  createApiDecorator({
    summary: 'Create organization',
    description:
      'Creates an organization for the authenticated company owner, links the owner to it, and enqueues an organization review notification for administrators.',
    body: CreateOrganizationDto,
    successResponse: {
      status: 201,
      type: OrganizationResponseDto,
      description: 'Organization was created successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description: 'Request body is invalid.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only company owners may create organizations.',
      }),
      ApiConflictResponse({
        description:
          'ICO already exists or the authenticated user is already linked to an organization.',
      }),
    ],
  });

export const ValidateOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Validate organization invitation',
    description:
      'Validates an organization invitation token for frontend onboarding screens and returns the invite email, organization name, and role to assign.',
    body: ValidateOrganizationInviteDto,
    successResponse: {
      status: 200,
      type: OrganizationInviteValidationResponseDto,
      description: 'Organization invitation is valid and may be accepted.',
    },
    errors: [
      ApiBadRequestResponse({
        description:
          'Invitation token is invalid for acceptance because it is expired, revoked, or otherwise inactive.',
      }),
      ApiNotFoundResponse({
        description: 'Invitation or organization was not found.',
      }),
    ],
  });

export const AcceptOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Accept organization invitation for existing account',
    description:
      'Allows an authenticated existing user to accept an organization invitation that matches their email and link their account to the organization.',
    body: ValidateOrganizationInviteDto,
    successResponse: {
      status: 201,
      type: OrganizationMemberResponseDto,
      description: 'Organization invitation was accepted successfully.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Invitation token is invalid for acceptance because it is expired, revoked, or otherwise inactive.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Invitation token does not belong to the authenticated user.',
      }),
      ApiNotFoundResponse({
        description: 'Invitation or organization was not found.',
      }),
      ApiConflictResponse({
        description:
          'Invitation was already accepted or the authenticated user is already linked to an organization.',
      }),
    ],
  });

export const CreateOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Create organization invitation',
    description:
      'Creates a pending invitation for an employee to join the authenticated company owner organization and enqueues the invitation email.',
    body: CreateOrganizationInviteDto,
    successResponse: {
      status: 201,
      type: OrganizationInviteResponseDto,
      description: 'Organization invitation was created successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid or organization identifier is malformed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the company owner of this organization may create invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
      ApiConflictResponse({
        description:
          'A user with this email already exists or an active invitation already exists.',
      }),
    ],
  });

export const GetMyOrganizationApi = () =>
  createApiDecorator({
    summary: 'Get my organization',
    description:
      'Returns the organization linked to the authenticated user via user.organizationId.',
    successResponse: {
      status: 200,
      type: OrganizationResponseDto,
      description: 'Organization payload.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'The authenticated user is not allowed to access this resource.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
    ],
  });

export const UpdateMyOrganizationApi = () =>
  createApiDecorator({
    summary: 'Update my organization profile',
    description:
      'Partially updates the organization profile for the authenticated company owner.',
    body: UpdateOrganizationProfileDto,
    successResponse: {
      status: 200,
      type: OrganizationResponseDto,
      description: 'Updated organization payload.',
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiBadRequestResponse({
        description:
          'Request body is invalid, empty, or contains no updatable fields.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description: 'Only company owners may update organization profiles.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
      ApiConflictResponse({
        description: 'ICO already exists.',
      }),
    ],
  });

export const GetOrganizationInvitesApi = () =>
  createApiDecorator({
    summary: 'List organization invitations',
    description:
      'Returns organization invitations for the authenticated company owner organization with optional filtering, pagination, and sorting.',
    successResponse: {
      status: 200,
      type: GetOrganizationInvitesResponseDto,
      description: 'Organization invitations were retrieved successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
      ApiQuery({
        name: 'status',
        required: false,
        enum: InvitationStatus,
      }),
      ApiQuery({
        name: 'q',
        required: false,
        description: 'Case-insensitive email substring filter.',
      }),
      ...createPaginationQueryDecorators({
        sortValues: ORGANIZATION_INVITE_SORT_VALUES,
        sortDescription: 'Sortable invite fields.',
        defaultSort: 'createdAt',
        defaultOrder: 'desc',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Query parameters are invalid or organization identifier is malformed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the company owner of this organization may view invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
    ],
  });

export const RevokeOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Revoke organization invitation',
    description:
      'Revokes a pending, non-expired organization invitation that belongs to the authenticated company owner organization.',
    successResponse: {
      status: 200,
      type: RevokeOrganizationInviteResponseDto,
      description: 'Organization invitation was revoked successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
      ApiParam({
        name: 'inviteId',
        description: 'Organization invitation identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Organization or invitation identifier is malformed, or the invitation state does not allow revocation.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the company owner of this organization may revoke invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or invitation not found.',
      }),
    ],
  });

export const ResendOrganizationInviteApi = () =>
  createApiDecorator({
    summary: 'Resend organization invitation',
    description:
      'Generates a new token and expiration date for a pending, non-expired organization invitation and enqueues a new invitation email.',
    successResponse: {
      status: 200,
      type: ResendOrganizationInviteResponseDto,
      description: 'Organization invitation was resent successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
      ApiParam({
        name: 'inviteId',
        description: 'Organization invitation identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Organization or invitation identifier is malformed, or the invitation state does not allow resending.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the company owner of this organization may resend invitations.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or invitation not found.',
      }),
    ],
  });

export const ListOrganizationMembersApi = () =>
  createApiDecorator({
    summary: 'List organization members',
    description:
      'Returns users linked to the organization. Company owners and company employees can list members only inside their own organization.',
    successResponse: {
      status: 200,
      type: OrganizationMemberResponseDto,
      description: 'Organization members were retrieved successfully.',
      isArray: true,
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description: 'Organization identifier is malformed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'The authenticated user is not allowed to list members of this organization.',
      }),
      ApiNotFoundResponse({
        description: 'Organization not found.',
      }),
    ],
  });

export const UpdateOrganizationMemberRoleApi = () =>
  createApiDecorator({
    summary: 'Update organization member role',
    description:
      'Updates the role of a non-owner organization member. Ownership transfer must be done through the dedicated owner transfer endpoint.',
    body: UpdateOrganizationMemberRoleDto,
    successResponse: {
      status: 200,
      type: OrganizationMemberResponseDto,
      description: 'Organization member role was updated successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
      ApiParam({
        name: 'userId',
        description: 'Organization member user identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Organization or user identifier is malformed, request body is invalid, or role change is not allowed.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the current company owner of this organization may update member roles.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or member not found.',
      }),
    ],
  });

export const RemoveOrganizationMemberApi = () =>
  createApiDecorator({
    summary: 'Remove organization member',
    description:
      'Removes a non-owner member from the organization. The current company owner cannot be removed directly.',
    successResponse: {
      status: 200,
      type: OrganizationMemberResponseDto,
      description: 'Organization member was removed successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
      ApiParam({
        name: 'userId',
        description: 'Organization member user identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Organization or user identifier is malformed, or the current owner removal was attempted.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the current company owner of this organization may remove members.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or member not found.',
      }),
    ],
  });

export const TransferOrganizationOwnerApi = () =>
  createApiDecorator({
    summary: 'Transfer organization ownership',
    description:
      'Transfers organization ownership to another active member in the same organization. The old owner is demoted to company employee and the new owner becomes company owner in one transaction.',
    body: TransferOrganizationOwnerDto,
    successResponse: {
      status: 200,
      type: OrganizationMemberResponseDto,
      description: 'Organization ownership was transferred successfully.',
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Organization identifier.',
        format: 'uuid',
      }),
    ],
    errors: [
      ApiBadRequestResponse({
        description:
          'Organization identifier is malformed, new owner is already the current owner, or new owner is not active.',
      }),
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiForbiddenResponse({
        description:
          'Only the current company owner of this organization may transfer ownership.',
      }),
      ApiNotFoundResponse({
        description: 'Organization or new owner member not found.',
      }),
    ],
  });
