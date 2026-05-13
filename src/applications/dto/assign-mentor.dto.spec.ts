import { validate } from 'class-validator';
import { AssignMentorDto } from './assign-mentor.dto';

describe('AssignMentorDto', () => {
  it('accepts valid mentor user id', async () => {
    const dto = new AssignMentorDto();
    dto.mentorUserId = 'a6ac7036-c7dd-4726-87c0-e1b5395f44b3';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid mentor user id', async () => {
    const dto = new AssignMentorDto();
    dto.mentorUserId = 'not-a-uuid';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
