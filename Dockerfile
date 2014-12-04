FROM ubuntu:14.04
MAINTAINER Roberto van Maanen <roberto.vanmaanen@gmail.com>

# install environment
RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y build-essential g++ curl libssl-dev apache2-utils git libxml2-dev mercurial man tree lsof wget openssl supervisor nano python

# nvm
ENV NODE_VERSION v0.10.29
RUN echo 'source /nvm/nvm.sh && nvm install ${NODE_VERSION}' | bash -l
ENV PATH /nvm/${NODE_VERSION}/bin:${PATH}
RUN npm install -g sm && /nvm/${NODE_VERSION}/lib/node_modules/sm/bin/sm install
RUN npm install -g forever

RUN git clone https://github.com/rvmn/wikinext.git
RUN cd wikinext
RUN npm install

WORKDIR /data
CMD ["/bin/bash", "-c", "/launch.sh"]
