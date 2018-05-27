## Tumblr embed test

As of late May 2018, Tumblr changed its website to be GDPR compliant. In doing so, it somehow broke its ability to show embedded posts to people from Europe under any circumstances: even if you have accepted its GDPR policy, and even if you're logged in.

Post embeds are a useful way of getting any Tumblr post's raw data, which otherwise isn't available except possibly through the Tumblr API. Since this change, my scripts using this data have broken unless they are running on a non-European VPN connection.

This is a simple test case displaying the problem and explaining the received and expected responses from Tumblr.

### Running the script

Just use `npm i` to install dependencies, then run `node index.js`.

You'll need to provide your own logged in cookies for the second test. Save them in `user-cookies.txt`. The [cookies.txt](https://chrome.google.com/webstore/detail/cookiestxt/njabckikapfpffapmjgojcnbfjonfjfg) extension for Chrome is a good way of getting them.

Read the source code to understand the responses logged in the terminal.

## License

MIT
