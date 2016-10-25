docker run -d -P --name selenium-hub selenium/hub

docker run -d --link selenium-hub:hub selenium/node-chrome
docker run -d --link selenium-hub:hub selenium/node-firefox
