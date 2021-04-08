#!/bin/bash
# Provisions an ubuntu trusty vagrant box to deploy a basic kalydo docker instance

#echo "»»» Adding kalydo user"
#sudo useradd -m kalydo --groups sudo
#sudo su -c "printf 'cd /home/kalydo\nsudo su kalydo' >> .bash_profile" -s /bin/sh vagrant

# Make kalydo superuser for now
#sudo "printf 'kalydo     ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers"

echo "»»» Updating the OS and the package manager"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "»»» Importing the Ubuntu public key"
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927

echo "»»» Enabling swap"
sudo apt-get install swapspace -y

echo "»»» Installing required dependant packages"
sudo apt-get install -y debian-archive-keyring
sudo apt-get install -y curl
sudo apt-get install -y gnupg
sudo apt-get install -y apt-transport-https
sudo apt-get install -y ca-certificates
sudo apt-get install -y software-properties-common

echo "»»» Installing docker-ce"
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu  $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

echo "»»» Installing docker-compose"
sudo curl -L "https://github.com/docker/compose/releases/download/1.27.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose


echo "»»» Installing node"
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential

echo "»»» Installing mocha"
sudo npm install mocha -g

echo "»»» Installing jq"
sudo apt-get install -y jq

echo "»»» Configuring password authentication"
sudo sed -i 's/ChallengeResponseAuthentication no/ChallengeResponseAuthentication yes/g' /etc/ssh/sshd_config
sudo systemctl restart ssh

echo " "
echo "-----------------------------------------------"
echo " Vagrant VM for Kalydo docker development complete.."
echo "-----------------------------------------------"
echo " "