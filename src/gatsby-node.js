import { createRemoteFileNode } from "gatsby-source-filesystem"
import moment from "moment"
import axios from "axios"

export function pluginOptionsSchema({ Joi }) {
  return Joi.object({
    token: Joi.string().required().description(`Graph API token.`),
    limit: Joi.number()
      .integer()
      .min(1)
      .default(5)
      .description(`Entries limit.`),
    locale: Joi.string().default("en").description(`Locale.`),
  })
}

export async function sourceNodes(
  { actions: { createNode }, createNodeId, reporter, createContentDigest },
  { token, limit }
) {
  const data = await axios
    .get(`https://graph.instagram.com/me/media`, {
      params: {
        fields:
          "id,media_url,media_type,permalink,timestamp,caption,username,thumbnail_url",
        limit,
        access_token: token,
      },
    })
    .then(({ data: { data } }) => {
      return data
    })
    .catch(function (error) {
      reporter.panic({
        context: {
          sourceMessage: `Instagram: ${error.message}`,
        },
      })
    })

  if (data) {
    data.forEach(
      ({
        id,
        media_url,
        media_type,
        permalink,
        timestamp,
        caption,
        username,
        thumbnail_url,
      }) => {
        createNode({
          id: `Instagram:${createNodeId(`${id}`)}`,
          timestamp,
          url: media_url,
          permalink,
          caption,
          username,
          mediaType: media_type,
          thumbnailUrl: thumbnail_url,
          remoteTypeName: "Instgram",
          internal: {
            type: `Instagram`,
            content: caption,
            contentDigest: createContentDigest(caption || ""),
          },
        })
      }
    )
  }
}

export async function onCreateNode({
  node,
  actions: { createNode },
  createNodeId,
  getCache,
  cache,
  reporter,
}) {
  if (node.remoteTypeName === "Instgram") {
    const url = node.thumbnailUrl || node.url

    if (url) {
      try {
        const fileNode = await createRemoteFileNode({
          url,
          parentNodeId: node.id,
          createNode,
          createNodeId,
          cache,
          getCache,
        })

        if (fileNode) {
          node.localFile = fileNode.id
        }
      } catch (error) {
        reporter.panic({
          context: {
            sourceMessage: `Instagram: ${error.message}`,
          },
        })
      }
    }
  }
}

export function createSchemaCustomization({ actions: { createTypes } }) {
  createTypes(`
    type Instagram implements Node {
      id: String!
      timestamp: Date @dateformat
      url: String!
      permalink: String!
      caption: String
      username: String!
      thumbnailUrl: String
      mediaType: String!
      localFile: File @link
    }
  `)
}

export function createResolvers({ createResolvers }, { locale }) {
  const resolvers = {
    Instagram: {
      formattedDate: {
        type: "String",
        resolve: ({ timestamp }) => {
          const m = moment(new Date(timestamp))
          m.locale(locale)

          return m.format("l")
        },
      },
    },
  }

  createResolvers(resolvers)
}
