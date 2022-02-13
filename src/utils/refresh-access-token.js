import axios from "axios"

export default async function refreshAccessToken(token) {
  return await axios
    .get(`https://graph.instagram.com/refresh_access_token`, {
      params: {
        grant_type: "ig_refresh_token",
        access_token: token,
      },
    })
    .then(({ data: { access_token } }) => access_token)
    .catch((error) => {
      console.error(error)

      return null
    })
}
