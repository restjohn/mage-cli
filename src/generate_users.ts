import uniqid from 'uniqid'
import passwords from 'generate-password'
import { UserCreateRequest } from './mage_client'

export function generateUser(roleId: string): UserCreateRequest {
  const stub = uniqid.time()
  const userNum = Math.trunc(Math.random() * 100 + 1)
  const emailNum = Math.trunc(Math.random() * 20 + 1)
  const phone =
    String(Math.trunc(Math.random() * 100)).padStart(3, '0') +  '-' +
    String(Math.trunc(Math.random() * 999)).padStart(3, '0') + '-' +
    String(Math.trunc(Math.random() * 9999)).padStart(4, '0')
  const passwordLength = Math.trunc(Math.random() * 7) + 16
  const password = passwords.generate({ length: passwordLength, numbers: true, symbols: true })
  return {
    username: `rando.${stub}-${userNum}`,
    displayName: `${stub}, Rando ${userNum}`,
    password,
    passwordconfirm: password,
    email: `${stub}-${userNum}@randomail-${emailNum}.wut`,
    phone,
    roleId,
  }
}

export function *generateUsers(count: number, roleId: string): Generator<UserCreateRequest> {
  let remaining = count
  while (remaining-- > 0) {
    yield generateUser(roleId)
  }
}