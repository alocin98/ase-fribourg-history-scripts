# Two environments: kraken pins torch 2.4 and transformers 4.57, while the MLX
# vision-language models need transformers 5.
TROCR := .venv-trocr/bin/python
VLM := .venv-vlm/bin/python
SYSTEM ?= mccatmus
SET ?= quick

.PHONY: install format check run candidates baselines

install:
	uv venv --python 3.12 .venv-trocr
	uv pip install --python $(TROCR) --index-strategy unsafe-best-match -r requirements-trocr.txt
	uv venv --python 3.12 .venv-vlm
	uv pip install --python $(VLM) -r requirements-vlm.txt

format:
	$(TROCR) -m ruff format .
	$(TROCR) -m ruff check --fix .

check:
	$(TROCR) -m ruff format --check .
	$(TROCR) -m ruff check .
	$(TROCR) -m pytest

# Run a candidate and write its report, e.g. make run SYSTEM=trocr SET=full
run:
	$(TROCR) -m bench run $(SYSTEM) --set $(SET)

candidates:
	for system in trocr mccatmus lid-mccatmus; do $(TROCR) -m bench run $$system --set $(SET); done

# Once per page set (~45 min for quick, ~6.5 h for full on an M5); resumes where it stopped.
baselines:
	$(VLM) -m bench run qwen3.5-9b --set $(SET)
	$(VLM) -m bench run churro-3b --set $(SET)
