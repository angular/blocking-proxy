FROM java:8-jre

ENV SAUCE_VERSION 4.3.15

WORKDIR /usr/local/sauce-connect

RUN apt-get update -qqy \
 && apt-get install -qqy \
      wget \
 && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN wget https://saucelabs.com/downloads/sc-$SAUCE_VERSION-linux.tar.gz -O - | tar -xz

WORKDIR /usr/local/sauce-connect/sc-$SAUCE_VERSION-linux

ENTRYPOINT ["/usr/local/sauce-connect/sc-4.3.15-linux/bin/sc"]

EXPOSE 8032

CMD ["--version"]
