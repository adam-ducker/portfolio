# Adam Ducker

I'm a seasoned software engineer with decades of experience working for startups and other remote development roles. The last six years I've mostly worked on enterprise level software for two pretty big teams at Take2 IT and JB Hunt Transportation. 

There's not much here yet but that will change. I've never been one to show off my personal projects but I'd like to change that starting now. 

## MLB Underground — Next.js

This is the latest version of my private website I call MLB Undergroud. It allows me to play MLB.tv streams and other MLB video content under my own custom interface. It's been a wild ride but I really love what I've built and it allows me to easily enjoy paid MLB content the way I like. It still has a few bugs here and there that I'm working on. 

### Interesting aspects

1. Custom UI with basic responsive design 
Basic user auth to protect the app and your MLB streams if it's in the wild
1. Implementation of MLB's authentication flow using Okta Oauth2 PKCE process and remediation loop
1. Video JS implementation with HLS plugins to play live streaming and archived versions of the M3U8 manifest files from MLB's media servers
1. Implementation of MLB's video highlights for teach team
1. Next.js combines the latest version of the front and backend to make it super easy to run locally or to deploy on a hosting service