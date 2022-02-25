import sodium from 'sodium-native'
const buf = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES)
sodium.randombytes_buf(buf)
// process.stdout.write(buf)
// console.log('\n\n')
const hexString = buf.toString('hex')
console.log(hexString)
