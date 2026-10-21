from pydantic import BaseModel, ConfigDict, Field


class InfoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    context: str = Field(alias="@context")
    id: str
    type: str
    profile: list[str]
    width: int
    height: int
    format: str
    maxWidth: int
    maxHeight: int
    extraFormats: list[str]
