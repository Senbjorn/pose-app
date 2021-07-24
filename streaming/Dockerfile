FROM ubuntu:20.04

WORKDIR /usr/src/app
RUN DEBIAN_FRONTEND=noninteractive apt-get update -y
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y wget
RUN apt update
RUN apt -y upgrade
RUN DEBIAN_FRONTEND=noninteractive apt install -y python3-pip
RUN DEBIAN_FRONTEND=noninteractive apt install -y build-essential libssl-dev libffi-dev python3-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y build-essential cmake git pkg-config libgtk-3-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y libxvidcore-dev libx264-dev libjpeg-dev libpng-dev libtiff-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y gfortran openexr libatlas-base-dev python3-dev python3-numpy
RUN DEBIAN_FRONTEND=noninteractive apt install -y libtbb2 libtbb-dev libdc1394-22-dev libopenexr-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev
RUN DEBIAN_FRONTEND=noninteractive apt install -y curl
RUN DEBIAN_FRONTEND=noninteractive apt install -y ffmpeg
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
RUN export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm install 16.5.0
ENV PATH="/root/.nvm/versions/node/v16.5.0/bin:${PATH}"
RUN node --version
RUN npm install --global yarn
# RUN ["/bin/bash", "-c", "node --version"]
# SHELL ["/bin/bash", "-c", "npm", "install", "--global", "yarn"]

# RUN apk update
# RUN apk upgrade
# RUN apk add --update --no-cache \
    # git cmake build-base openblas-dev unzip wget cmake \
    #Intel® TBB, a widely used C++ template library for task parallelism'
    #   libtbb libtbb-dev \
    # Wrapper for libjpeg-turbo
    # libjpeg \
    # accelerated baseline JPEG compression and decompression library
    # libjpeg-turbo-dev \
    # Portable Network Graphics library
    # libpng-dev \
    # A software-based implementation of the codec specified in the emerging JPEG-2000 Part-1 standard (development files)
    #   jasper-dev \
    # Provides support for the Tag Image File Format or TIFF (development files)
    # tiff-dev \
    # Libraries for working with WebP images (development files)
    # libwebp-dev \
    # A C language family front-end for LLVM (development files)
    # clang-dev \
    # linux-headers \
    # ffmpeg \
    # python3 py3-pip
# RUN apk add --no-cache --virtual .gyp python make g++ pkgconfig pixman-dev cairo-dev pango-dev
# RUN apk add libc6-compat
# RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
# RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
COPY package.json ./
RUN yarn install
COPY . .

EXPOSE 3000
CMD [ "yarn", "start" ]