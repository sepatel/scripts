#!/bin/bash
##

DIR=$1

echo "Duplicates Detection on ${DIR}";

echo -n '' > /tmp/checksums.txt
find "${DIR}" -type f -print0 | while read -d $'\0' file
do
  md5sum "${file}" >> /tmp/checksums.txt
done
cat /tmp/checksums.txt | awk '{ print $1 }' | sort | uniq -c | egrep -v "\s1 " | awk '{print $2}' > /tmp/duplicates.txt

echo -n '' > /tmp/results.txt
for dup in `cat /tmp/duplicates.txt`
do
  grep ${dup} /tmp/checksums.txt >> /tmp/results.txt
  echo '' >> /tmp/results.txt
done

