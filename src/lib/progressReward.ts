export type BaseReward = {
  rewardType: 'content_practice';
  contentId: string;
  status: 'awarded' | 'already_rewarded' | 'not_eligible' | 'not_applicable' | 'legacy_review_required';
  xpAwarded: 0 | 50;
};

export type AttemptReward = { xpAwarded: 0 | 10 };

export function validBaseReward(reward: BaseReward | undefined, contentId: string, xpAwarded: number, replayed: boolean, attemptXp = 0): boolean {
  return !!reward && reward.rewardType === 'content_practice' && reward.contentId === contentId
    && ['awarded', 'already_rewarded', 'not_eligible', 'not_applicable', 'legacy_review_required'].includes(reward.status)
    && reward.xpAwarded + attemptXp === xpAwarded && [0, 50].includes(reward.xpAwarded)
    && [0, 10].includes(attemptXp)
    && (reward.status === 'awarded' ? reward.xpAwarded === 50 && attemptXp === 0 && !replayed : reward.xpAwarded === 0)
    && (attemptXp === 0 || (!replayed && ['not_eligible', 'already_rewarded', 'legacy_review_required'].includes(reward.status)));
}

// Base content XP is separate from any newly earned badge XP in official totals.
export function practiceRewardMessage(receipt: { baseReward: BaseReward; attemptReward?: AttemptReward; replayed: boolean }): string {
  if (receipt.replayed) return 'Na-save na ang pagsubok na ito. Walang dobleng XP o pagsubok.';
  if (receipt.attemptReward?.xpAwarded) return `+${receipt.attemptReward.xpAwarded} XP pa rin sa pagsisikap mo! Subukan ulit para mas mapahusay ang pagbasa.`;
  switch (receipt.baseReward.status) {
    case 'awarded': return `+${receipt.baseReward.xpAwarded} XP para sa unang kwalipikadong pagsubok!`;
    case 'already_rewarded': return 'Na-save ang bagong pagsubok. Nakuha na ang XP para sa nilalamang ito.';
    case 'legacy_review_required': return 'Na-save ang pagsubok. Kailangang suriin ang dating XP bago magbigay ng gantimpala.';
    default: return 'Na-save ang pagsubok. Walang dagdag na XP para sa nilalamang ito.';
  }
}
