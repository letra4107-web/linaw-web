const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);
const isGrade = (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 6;
const isAccuracy = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
const isBoundedString = (value, max, { allowEmpty = true } = {}) => typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
function validateUuidParam(name) {
  return (req, res, next) => isUuid(req.params[name]) ? next() : res.status(400).json({ error: `Invalid ${name}.` });
}
module.exports = { isUuid, isGrade, isAccuracy, isBoundedString, validateUuidParam };
