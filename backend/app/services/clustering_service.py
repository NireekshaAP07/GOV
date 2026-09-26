"""Conservative connected components over human-approved equivalent links."""
from collections import defaultdict, deque


def clusters(material_ids: list[int], matches: list[dict]) -> list[list[int]]:
    graph=defaultdict(set)
    for match in matches:
        if match.get("status") != "APPROVE" or match.get("conflicting_features"):
            continue
        a,b=match["material_a_id"],match["material_b_id"]
        graph[a].add(b); graph[b].add(a)
    seen=set(); output=[]
    for node in material_ids:
        if node in seen or node not in graph: continue
        group=[]; queue=deque([node]); seen.add(node)
        while queue:
            current=queue.popleft(); group.append(current)
            for neighbor in graph[current]:
                if neighbor not in seen: seen.add(neighbor); queue.append(neighbor)
        if len(group)>1: output.append(sorted(group))
    return output
