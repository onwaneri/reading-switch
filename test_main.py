from main import get_word_matrix
import json

words = ["photography", "cupboard", "education", "happiness", "running", "prehistoric"]

for word in words:
    print(f"\nTesting: {word}")
    result = get_word_matrix(word)
    print(json.dumps(result, indent=2))