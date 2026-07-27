# Adam Ducker

I'm a seasoned software engineer with decades of experience working for startups and other remote development roles. The last six years I've mostly worked on enterprise level software for two pretty big teams at Take2 IT and JB Hunt Transportation. 

There's not much here yet but that will change. I've never been one to show off my personal projects but I'd like to change that starting now. 

## MLB Underground — Next.js

This is the latest version of my private website I call MLB Underground. It allows me to play MLB.tv streams and other MLB video content under my own custom interface. 

This has changed over the years. At times the front end was React and then Angular.  The backend alternated between PHP and Ruby on Rails. This Next.js based combination of the front and back represents a big step forward in improving how I work on bugs or enhance the application and how I deploy it for my own private use.

A lot has changed over the years and I just had to roll with it. MLB has changed their streaming service provider, they've changed how their authentication flow works. They've placed tigther and tigther CORs restrictions and geolocation based protections on streams. It's been a wild ride but I really love what I've built and it allows me to easily enjoy paid MLB content the way I like. This will likely never be a finished project. I'm always tinkering with it.

### Interesting aspects

1. Custom UI with simple responsive design 
1. Option for basic user auth to protect the app and your MLB streams if it's out in the wild
1. Implementation of MLB's authentication flow using Okta Oauth2 PKCE process and remediation loop
1. Video JS implementation with HLS plugins to play live streaming and archived versions of the M3U8 manifest files from MLB's media servers
1. Implementation of MLB's video highlights for teach team
1. Next.js combines the latest version of the front and backend to make it super easy to run locally or to deploy on a hosting service
1. Claude has built a great deal of this based on existing older versions of the application and makes it quicker than ever to make changes and fix bugs