#!/opt/homebrew/bin/python3
import sys

# print("[STANDBY]")
print("[STANDBY]")

while True:
    line = sys.stdin.readline()
    if len(line) == 0:
        break
    print("#", line, file=sys.stderr)
    print("[COMPLETE]")
