export type BaseReward = {
  rewardType: 'content_practice';
  contentId: string;
  status: 'awarded' | 'already_rewarded' | 'not_eligible' | 'not_applicable' | 'legacy_review_required';
  xpAwarded: 0 | 50;
};

export function validBaseReward(reward: BaseReward | undefined, contentId: string, xpAwarded: number, replayed: boolean): boolean {
  return !!reward && reward.rewardType === 'content_practice' && reward.contentId === contentId
    && ['awarded', 'already_rewarded', 'not_eligible', 'not_applicable', 'legacy_review_required'].includes(reward.status)
    && reward.xpAwarded === xpAwarded && [0, 50].includes(xpAwarded)
    && (reward.status === 'awarded' ? xpAwarded === 50 && !replayed : xpAwarded === 0);
}

// Base content XP is separate from any newly earned badge XP in official totals.
export function practiceRewardMessage(receipt: { baseReward: BaseReward; replayed: boolean }): string {
  if (receipt.replayed) return 'Na-save na ang pagsubok na ito. Walang dobleng XP o pagsubok.';
  switch (receipt.baseReward.status) {
    case 'awarded': return `+${receipt.baseReward.xpAwarded} XP para sa unang kwalipikadong pagsubok!`;
    case 'already_rewarded': return 'Na-save ang bagong pagsubok. Nakuha na ang XP para sa nilalamang ito.';
    case 'legacy_review_required': return 'Na-save ang pagsubok. Kailangang suriin ang dating XP bago magbigay ng gantimpala.';
    default: return 'Na-save ang pagsubok. Walang dagdag na XP para sa nilalamang ito.';
  }
}
