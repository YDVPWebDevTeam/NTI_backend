export class ProfileNotFoundError extends Error {
  constructor() {
    super('Student profile not found');
    this.name = 'ProfileNotFoundError';
  }
}
