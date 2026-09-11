import assert from 'node:assert/strict'

const base = process.env.AUTH_TEST_URL ?? 'http://localhost:3000'
const password = process.env.AUTH_TEST_PASSWORD
assert.ok(password, 'Set AUTH_TEST_PASSWORD to the dev user password')
const request = (path, { cookie, body, origin, method = 'GET' } = {}) => fetch(`${base}${path}`, {
  method,
  headers: { ...(cookie && { Cookie: cookie }), ...(origin && { Origin: origin }), ...(body && { 'Content-Type': 'application/json' }) },
  ...(body && { body: JSON.stringify(body) }),
})
for (const path of ['/contracts', '/properties', '/owners', '/tenants', '/receipts', '/auth/me']) {
  assert.equal((await request(path)).status, 401, `Anonymous access: ${path}`)
}
assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'roark', password: 'wrong' } })).status, 401)
assert.equal((await request('/auth/login', { method: 'POST', body: { username: 'missing-user', password } })).status, 401)
assert.equal((await request('/auth/login', { method: 'POST', origin: 'https://untrusted.example', body: { username: 'roark', password } })).status, 403)
const login = await request('/auth/login', { method: 'POST', origin: 'http://dev.roark.uno', body: { username: 'roark', password } })
assert.equal(login.status, 200)
const header = login.headers.get('set-cookie')
assert.match(header, /HttpOnly/i)
assert.match(header, /SameSite=Lax/i)
const cookie = header.split(';')[0]
try {
  assert.equal((await request('/auth/me', { cookie })).status, 200)
  assert.equal((await request('/contracts', { cookie })).status, 200)
  assert.equal((await request('/auth/me', { cookie: `${cookie}bad` })).status, 401)
} finally {
  assert.equal((await request('/auth/logout', { method: 'POST', cookie })).status, 204)
}
assert.equal((await request('/auth/me', { cookie })).status, 401)
assert.equal((await request('/health')).status, 200)
console.log('Auth checks passed: anonymous protection, invalid credentials, origin check, login, cookies, authenticated access, tampered token, logout revocation, health.')
