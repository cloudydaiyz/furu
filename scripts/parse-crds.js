#!/usr/bin/env node

// Utility script to help with parsing JSON output from AWS EC2 instance commands

function extract(output, target, mode) {
  let res;
  if(target == 'public-dns') {
    res = mode == 'describe' 
      ? output.Reservations[0].Instances[0].PublicDnsName
      : output.Instances[0].PublicDnsName;
    console.log(res);
  } else if(target == 'instance-id') {
    res = mode == 'describe' 
      ? output.Reservations[0].Instances[0].InstanceId
      : output.Instances[0].InstanceId;
    console.log(res);
  } else {
    throw new Error("Invalid mode");
  }
  return res;
}

if(!module.parent) {
  if(process.argv.length < 4) {
    throw new Error("Invalid number of command line arguments.")
  }
  extract(JSON.parse(process.argv[2]), process.argv[3], process.argv[4]);
}

module.exports = extract;