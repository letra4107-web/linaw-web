// Recovery must also find older Auth accounts whose app profile is missing.
// Read only: never use generateLink/signup as an account-existence probe.
const PAGE_SIZE = 200;
const MAX_PAGES = 50;
async function findExistingAuthEmail(client, email) {
  const normalized = String(email || '').trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (result.error) throw result.error;
    const users = result.data?.users;
    if (!Array.isArray(users)) throw Error('Auth account lookup unavailable');
    const user = users.find(row => row.id && !row.deleted_at && String(row.email || '').trim().toLowerCase() === normalized);
    if (user) return user;
    if (users.length < PAGE_SIZE || (result.data.lastPage && page >= result.data.lastPage)) return null;
  }
  // A bounded lookup failure must not masquerade as a successful email send.
  throw Error('Auth account lookup limit reached');
}
module.exports = { findExistingAuthEmail };
