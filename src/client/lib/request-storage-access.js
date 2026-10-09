export async function requestStorageAccess () {
  try {
    if (document.requestStorageAccess) {
      await document.requestStorageAccess()
      console.log('has storage access')
    } else {
      console.log('requestStorageAccess not supported')
    }
  } catch (err) {
    console.error(err)
  }
}
