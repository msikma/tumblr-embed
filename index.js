const request = require('request')
const cheerio = require('cheerio')
const FileCookieStore = require('file-cookie-store')
const Promise = require('bluebird');

// guest-cookies.txt contains the cookies I get after I accept the GDPR notice without an account.
const guestCookies = new FileCookieStore('./guest-cookies.txt')
const guestCookieJar = request.jar(guestCookies)
// user-cookies.txt contains the cookies after accepting and registering a new account.
const userCookies = new FileCookieStore('./user-cookies.txt')
const userCookieJar = request.jar(userCookies)

// Promisify request so we can await it.
const requestP = Promise.promisify(request)
guestCookies.getAllCookies = Promise.promisify(guestCookies.getAllCookies)
userCookies.getAllCookies = Promise.promisify(userCookies.getAllCookies)

const runTest = async (cookieStore = null, cookieJar = null) => {
  // Testing blog with some art. Any post will do.
  const testURL = 'http://crownwithoutaqueen.tumblr.com/post/141513923043/ein-bleistift-und-radiergummi-oskar-fischinger'

  console.log('-')

  // Ensure we have cookies when passed a cookieStore. Otherwise the test won't work.
  if (cookieStore != null && (await cookieStore.getAllCookies()).length === 0) {
    console.log('No cookies present in store. Canceling test.')
    return
  }

  // Make the oEmbed URL. This returns JSON content per the oEmbed 1.0 standard.
  // See <https://oembed.com/> for the full specification.
  const oEmbedURL = `https://www.tumblr.com/oembed/1.0?url=${encodeURIComponent(testURL)}`
  const oEmbedData = JSON.parse((await requestP({ url: oEmbedURL, jar: cookieJar })).body)

  // The oEmbedData contains the following HTML string:
  //
  // <div class="tumblr-post" data-href="https://embed.tumblr.com/embed/post/ZiphMe0DL7v1r6CzZqWWCw/141513923043" data-did="7bd19f4ca1dbc06f2a11925c6da50cdb70d7d7bf">
  //   <a href="http://crownwithoutaqueen.tumblr.com/post/141513923043/ein-bleistift-und-radiergummi-oskar-fischinger">
  //     http://crownwithoutaqueen.tumblr.com/post/141513923043/ein-bleistift-und-radiergummi-oskar-fischinger
  //   </a>
  // </div>
  // <script async src="https://assets.tumblr.com/post.js"></script>
  //
  // This is a Tumblr embed code. We need the data-href value because it contains the post,
  // with a big JSON object that contains all of the post's information, the "bootstrap data".
  // To my knowledge there's no other way to get this data aside from using the Tumblr API.

  const $embedCode = cheerio.load(oEmbedData.html)
  const embedPostURL = $embedCode('.tumblr-post').attr('data-href').trim()

  // Fetch the post HTML, parse it and extract the bootstrap data.
  const postReq = await requestP({ url: embedPostURL, jar: cookieJar })
  const $tumblrPost = cheerio.load(postReq.body)
  const bootstrapData = JSON.parse($tumblrPost('noscript[data-bootstrap]').attr('data-bootstrap').trim())

  // Normally, we'd find the post data here:
  //
  // bootstrapData.Components.EmbeddablePost.posts_data[0]
  //
  // But since GDPR went into effect, EmbeddablePost is no longer there, and instead we have ConsentForm.
  // This contains a huge amount of data, presumably to allow people to consent using the post.js code,
  // except that it doesn't work and the post.js source doesn't have anything related to GDPR consent anyway.
  //
  // The ConsentForm contains a ton of vendors in partner_consent.data.vendors, an explanation from Tumblr
  // in slides[0].text, and no way to actually load or post a URL to offer consent.

  if (postReq.request.uri.pathname === '/privacy/consent') {
    // No post data. Only ConsentForm. This happens when not logged in or using guest GDPR cookies.
    console.log('Hit ConsentForm wall.')
    //console.log(bootstrapData.Components.ConsentForm)
  }
  if (postReq.request.uri.pathname === '/dashboard') {
    // Redirected to dashboard. bootstrapData contains dashboard data for the latest few posts.
    // This happens when using logged in cookies.
    console.log('Redirected to dashboard.')
    //console.log(bootstrapData)
  }

  // If you're not in Europe, you will get this instead: an object containing all of the post URL's data.
  // No redirect, just the embedded post HTML including the proper bootstrap data.
  // You can test this by using a VPN, or having a friend outside of Europe run the script.
  try {
    // Complete post data is present.
    const postData = bootstrapData.Components.EmbeddablePost.posts_data[0]
    console.log(`Found post data. Blog title: ${postData.blog.name}, post slug: ${postData.slug}`)
  }
  catch (err) {
    console.log('No post data found.')
  }
}

const runTests = async () => {
  // Running with guestCookies, even though they contain GDPR acceptance values, hits the ConsentForm wall.
  // Same as running without cookies entirely.
  await runTest(guestCookies, guestCookieJar)

  // Running with userCookies does something even weirder: it redirects to 'https://www.tumblr.com/privacy/consent',
  // which sends a 303 See Other and immediately redirects back to 'https://www.tumblr.com/dashboard'.
  // Again, even though we've accepted the GDPR and are even logged in this time.
  await runTest(userCookies, userCookieJar)
}

runTests()
