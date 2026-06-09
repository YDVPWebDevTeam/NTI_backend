import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

/**
 * Approved Slovak university email domains. UKF (Univerzita Konštantína
 * Filozofa v Nitre) is the priority. Admins can add more at runtime.
 */
const APPROVED_DOMAINS = [
  'ukf.sk',
  'student.ukf.sk',
  'uniba.sk',
  'stuba.sk',
  'tuke.sk',
  'uniag.sk',
  'umb.sk',
  'euba.sk',
  'upjs.sk',
  'tvu.sk',
  'uniza.sk',
];

export const universityEmailDomainsSeed: SeedTask = {
  name: '005-university-email-domains',
  async run(context) {
    const now = context.now();

    for (const domain of APPROVED_DOMAINS) {
      await context.client.query(
        `INSERT INTO "UniversityEmailDomain" (
          id,
          domain,
          status,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (domain) DO NOTHING`,
        [randomUUID(), domain, 'APPROVED', now, now],
      );
    }
  },
};
