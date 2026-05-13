import { validate } from 'class-validator';
import { CreateMentorshipNoteDto } from './create-mentorship-note.dto';

describe('CreateMentorshipNoteDto', () => {
  it('accepts non-empty content', async () => {
    const dto = new CreateMentorshipNoteDto();
    dto.content = 'Weekly check-in completed.';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects empty content', async () => {
    const dto = new CreateMentorshipNoteDto();
    dto.content = '';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
