// Shared data-loading helper for the reading-insights routes (student.js and
// parent.js). student_content_completions can be large per student, so this
// pages through it the same way mobile's backend does.
async function loadCompletedContentIds(supabase, studentId) {
  const contentIds = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from('student_content_completions')
      .select('content_id')
      .eq('student_id', studentId)
      .range(start, start + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    contentIds.push(...page.map((row) => row.content_id));
    if (page.length < pageSize) return contentIds;
  }
}

module.exports = { loadCompletedContentIds };
