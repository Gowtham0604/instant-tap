import { createDailyChallengePost } from './daily';
import { generateDailyChallenge } from '../../shared/daily';

export const createPost = async () => {
  const challenge = generateDailyChallenge();
  const { postId } = await createDailyChallengePost(challenge);
  return { id: postId };
};
