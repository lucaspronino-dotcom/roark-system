const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { resolve } = require('node:path')
const apiRequire = createRequire(resolve(__dirname, '../apps/api/package.json'))
const { validateSync } = apiRequire('class-validator')
for (const [role, name] of [['tenant', 'Tenant'], ['owner', 'Owner']]) {
  for (const action of ['create', 'update']) {
    const dto = require(`../apps/api/dist/src/${role}s/dto/${action}-${role}.dto.js`)[`${action[0].toUpperCase() + action.slice(1)}${name}Dto`]
    for (const dni of [undefined, null, '', '12345678']) {
      const value = Object.assign(new dto(), { firstName: 'Prueba', lastName: 'Temporal', phone: '123', rentalAddress: 'Calle ficticia', address: 'Calle ficticia', city: 'Prueba', dni })
      assert.equal(validateSync(value).filter((e) => e.property === 'dni').length, 0)
    }
    const bad = Object.assign(new dto(), { dni: 123 })
    assert.equal(validateSync(bad).filter((e) => e.property === 'dni').length, 1)
  }
}
console.log('Owner and tenant DTOs accept missing/blank/null DNI; reject non-string DNI.')
